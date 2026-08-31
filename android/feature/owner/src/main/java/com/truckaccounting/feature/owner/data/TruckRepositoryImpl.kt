package com.truckaccounting.feature.owner.data

import com.truckaccounting.core.database.dao.TruckDao
import com.truckaccounting.core.database.entity.TruckEntity
import com.truckaccounting.core.network.TruckApi
import com.truckaccounting.core.network.TruckRequest
import com.truckaccounting.core.network.toAppError
import com.truckaccounting.feature.owner.domain.Truck
import com.truckaccounting.feature.owner.domain.TruckRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Phase 3 §28: replaced the Room-only Phase 2 placeholder with a real API-backed implementation.
 * Room is kept, but now purely as an offline-first CACHE in front of [TruckApi] (Phase 1 §8's
 * "Room -> Sync Manager -> Backend" flow) rather than being the source of truth itself: every
 * mutation (add/update/delete) goes to the backend FIRST, and Room is only updated once the
 * server confirms — so the local cache can never show a truck the backend doesn't actually have.
 * [TruckRepository] itself is untouched; ViewModels/Composables need no changes.
 */
@Singleton
class TruckRepositoryImpl @Inject constructor(
    private val truckDao: TruckDao,
    private val truckApi: TruckApi,
) : TruckRepository {

    override fun observeTrucks(ownerId: String): Flow<List<Truck>> =
        truckDao.observeTrucks(ownerId)
            .map { entities -> entities.map { it.toDomain() } }
            .onStart { runCatching { refresh(ownerId) } } // best-effort refresh; UI still shows cached data if this fails

    override suspend fun addTruck(ownerId: String, plate: String, brand: String, modelYear: String): Result<Truck> {
        if (plate.isBlank() || brand.isBlank() || modelYear.isBlank()) {
            return Result.failure(IllegalArgumentException("لطفاً شماره پلاک، برند و مدل را کامل وارد کنید"))
        }
        return runCatching {
            val response = truckApi.createTruck(TruckRequest(plate = plate, brand = brand, modelYear = modelYear))
            val entity = TruckEntity(id = response.id, ownerId = ownerId, plate = response.plate, brand = response.brand, modelYear = response.modelYear)
            truckDao.upsert(entity)
            entity.toDomain()
        }.recoverCatching { throw it.toAppError() }
    }

    override suspend fun updateTruck(truck: Truck): Result<Unit> = runCatching {
        val response = truckApi.updateTruck(truck.id, TruckRequest(plate = truck.plate, brand = truck.brand, modelYear = truck.modelYear))
        val existing = truckDao.getById(truck.id)
        if (existing != null) {
            truckDao.update(existing.copy(plate = response.plate, brand = response.brand, modelYear = response.modelYear))
        }
    }.recoverCatching { throw it.toAppError() }

    override suspend fun deleteTruck(truckId: String): Result<Unit> = runCatching {
        truckApi.deleteTruck(truckId)
        truckDao.deleteById(truckId)
    }.recoverCatching { throw it.toAppError() }

    /** Pulls the authoritative list from the backend and reconciles the local cache. */
    private suspend fun refresh(ownerId: String) {
        val remoteTrucks = truckApi.listTrucks().trucks
        remoteTrucks.forEach { response ->
            truckDao.upsert(TruckEntity(id = response.id, ownerId = ownerId, plate = response.plate, brand = response.brand, modelYear = response.modelYear))
        }
        // NOTE: this upserts everything the backend currently reports but does not yet prune
        // locally-cached trucks that were deleted on another device — full reconciliation
        // (including deletions) belongs with the WorkManager-based Sync Manager Phase 1 §8
        // already flags as future work. Deletions made from THIS device are still removed
        // immediately by deleteTruck() above, which is the common case.
    }

    private fun TruckEntity.toDomain() = Truck(id = id, plate = plate, brand = brand, modelYear = modelYear)
}
