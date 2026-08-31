package com.truckaccounting.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.truckaccounting.core.database.entity.DriverEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DriverDao {
    @Query("SELECT * FROM drivers WHERE ownerId = :ownerId ORDER BY id DESC")
    fun observeDrivers(ownerId: String): Flow<List<DriverEntity>>

    @Query("SELECT * FROM drivers WHERE id = :id")
    suspend fun getById(id: String): DriverEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(driver: DriverEntity)

    @Update
    suspend fun update(driver: DriverEntity)
}
