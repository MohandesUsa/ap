package com.truckaccounting.feature.owner.data

import com.truckaccounting.core.database.dao.TruckDao
import com.truckaccounting.core.database.entity.TruckEntity
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class TruckRepositoryImplTest {

    private class FakeTruckDao : TruckDao {
        private val state = MutableStateFlow<List<TruckEntity>>(emptyList())

        override fun observeTrucks(ownerId: String): Flow<List<TruckEntity>> = state.asStateFlow()
        override suspend fun getById(id: String): TruckEntity? = state.value.find { it.id == id }
        override suspend fun upsert(truck: TruckEntity) {
            state.value = state.value.filterNot { it.id == truck.id } + truck
        }
        override suspend fun update(truck: TruckEntity) {
            state.value = state.value.map { if (it.id == truck.id) truck else it }
        }
        override suspend fun delete(truck: TruckEntity) {
            state.value = state.value.filterNot { it.id == truck.id }
        }
        override suspend fun deleteById(id: String) {
            state.value = state.value.filterNot { it.id == id }
        }
    }

    @Test
    fun `addTruck rejects blank fields without touching the DAO`() = runTest {
        val dao = FakeTruckDao()
        val repository = TruckRepositoryImpl(dao)

        val result = repository.addTruck(ownerId = "o1", plate = "", brand = "ولوو", modelYear = "1401")

        assertTrue(result.isFailure)
        assertEquals(0, dao.getById("anything")?.let { 1 } ?: 0)
    }

    @Test
    fun `addTruck with valid data persists and is observable`() = runTest {
        val dao = FakeTruckDao()
        val repository = TruckRepositoryImpl(dao)

        val result = repository.addTruck(
            ownerId = "o1",
            plate = "22 الف 262 ایران 22",
            brand = "ولوو",
            modelYear = "1401",
        )

        assertTrue(result.isSuccess)
        val truck = result.getOrThrow()
        assertEquals("22 الف 262 ایران 22", truck.plate)
    }

    @Test
    fun `deleteTruck removes the truck from subsequent observations`() = runTest {
        val dao = FakeTruckDao()
        val repository = TruckRepositoryImpl(dao)
        val added = repository.addTruck("o1", "22 الف 262 ایران 22", "ولوو", "1401").getOrThrow()

        val deleteResult = repository.deleteTruck(added.id)

        assertTrue(deleteResult.isSuccess)
        assertEquals(null, dao.getById(added.id))
    }

    @Test
    fun `updateTruck fails gracefully for an unknown id`() = runTest {
        val dao = FakeTruckDao()
        val repository = TruckRepositoryImpl(dao)

        val result = repository.updateTruck(
            com.truckaccounting.feature.owner.domain.Truck("missing-id", "22 الف 262 ایران 22", "ولوو", "1401"),
        )

        assertTrue(result.isFailure)
    }
}
