package com.truckaccounting.core.database.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.truckaccounting.core.database.entity.TruckEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TruckDao {
    @Query("SELECT * FROM trucks WHERE ownerId = :ownerId ORDER BY id DESC")
    fun observeTrucks(ownerId: String): Flow<List<TruckEntity>>

    @Query("SELECT * FROM trucks WHERE id = :id")
    suspend fun getById(id: String): TruckEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(truck: TruckEntity)

    @Update
    suspend fun update(truck: TruckEntity)

    @Delete
    suspend fun delete(truck: TruckEntity)

    @Query("DELETE FROM trucks WHERE id = :id")
    suspend fun deleteById(id: String)
}
