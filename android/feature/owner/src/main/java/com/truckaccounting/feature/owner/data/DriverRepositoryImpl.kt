package com.truckaccounting.feature.owner.data

import com.truckaccounting.core.database.dao.DriverDao
import com.truckaccounting.core.database.entity.DriverEntity
import com.truckaccounting.core.network.CreateInvitationRequest
import com.truckaccounting.core.network.DriverApi
import com.truckaccounting.core.network.toAppError
import com.truckaccounting.feature.owner.domain.Driver
import com.truckaccounting.feature.owner.domain.DriverPayType
import com.truckaccounting.feature.owner.domain.DriverRepository
import com.truckaccounting.feature.owner.domain.DriverStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Phase 3 §28: invite() and observeDrivers() now call the real backend via [DriverApi].
 *
 * Unlike [TruckRepositoryImpl], this does NOT cache the drivers list in Room: [DriverEntity]'s
 * current schema only has id/userId/ownerId/licenseNumber/payType/payValue — it has no columns
 * for the display name, phone, or connected-truck plate the owner's Drivers screen needs (those
 * live on the User/Truck rows server-side, joined at query time). Rather than force an
 * under-scoped schema migration into this pass, observeDrivers() is a straightforward
 * network-backed Flow for now; adding Room caching later means extending DriverEntity with the
 * missing columns and following the exact same onStart-refresh pattern TruckRepositoryImpl uses.
 *
 * [updatePay] is intentionally still Room-only — Phase 3's backend does not define a driver
 * pay-rate endpoint (that's a Phase 2 Android-only feature); wiring it to the server is future
 * work once that endpoint exists.
 */
@Singleton
class DriverRepositoryImpl @Inject constructor(
    private val driverDao: DriverDao,
    private val driverApi: DriverApi,
) : DriverRepository {

    override fun observeDrivers(ownerId: String): Flow<List<Driver>> = flow {
        val response = runCatching { driverApi.listDrivers() }.getOrElse { throw it.toAppError() }
        emit(
            response.drivers.map { d ->
                Driver(
                    id = d.id,
                    name = d.fullName,
                    phone = "",
                    truckPlate = d.plate,
                    status = DriverStatus.ACTIVE, // listDrivers() only returns currently-connected drivers
                    payType = if (d.payType == "salary") DriverPayType.SALARY else DriverPayType.PERCENT,
                    payValue = d.payValue.toLong(),
                )
            },
        )
    }

    override suspend fun invite(ownerId: String, phone: String, truckId: String?): Result<String> {
        if (phone.isBlank()) return Result.failure(IllegalArgumentException("شماره موبایل راننده را وارد کنید"))
        return runCatching {
            val response = driverApi.createInvitation(CreateInvitationRequest(driverPhone = phone, truckId = truckId))
            response.inviteCode
        }.recoverCatching { throw it.toAppError() }
    }

    override suspend fun updatePay(driverId: String, payType: DriverPayType, payValue: Long): Result<Unit> {
        val existing = driverDao.getById(driverId)
            ?: DriverEntity(id = driverId, userId = "", ownerId = "", licenseNumber = null, payType = "percent", payValue = 20)
        driverDao.upsert(existing.copy(payType = payType.name.lowercase(), payValue = payValue))
        return Result.success(Unit)
    }
}
