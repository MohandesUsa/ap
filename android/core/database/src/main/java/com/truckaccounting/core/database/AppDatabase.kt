package com.truckaccounting.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import com.truckaccounting.core.database.dao.DriverDao
import com.truckaccounting.core.database.dao.TruckDao
import com.truckaccounting.core.database.dao.UserDao
import com.truckaccounting.core.database.entity.DriverEntity
import com.truckaccounting.core.database.entity.ExpenseEntity
import com.truckaccounting.core.database.entity.OwnerEntity
import com.truckaccounting.core.database.entity.PaymentEntity
import com.truckaccounting.core.database.entity.SettlementEntity
import com.truckaccounting.core.database.entity.TripEntity
import com.truckaccounting.core.database.entity.TruckEntity
import com.truckaccounting.core.database.entity.UserEntity

@Database(
    entities = [
        UserEntity::class,
        OwnerEntity::class,
        DriverEntity::class,
        TruckEntity::class,
        TripEntity::class,
        ExpenseEntity::class,
        SettlementEntity::class,
        PaymentEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun truckDao(): TruckDao
    abstract fun driverDao(): DriverDao

    companion object {
        const val DATABASE_NAME = "truckaccounting.db"

        /**
         * Placeholder for the first real migration (v1 -> v2). Room's `fallbackToDestructiveMigration()`
         * must NEVER be used once the app ships with real user data — every future schema change
         * gets its own Migration object added to this list and passed to
         * `Room.databaseBuilder(...).addMigrations(*MIGRATIONS)`.
         *
         * Example for the future `subscriptions` table (Phase 2 addendum §11.10):
         *
         *   val MIGRATION_1_2 = object : Migration(1, 2) {
         *       override fun migrate(db: SupportSQLiteDatabase) {
         *           db.execSQL("""
         *               CREATE TABLE IF NOT EXISTS subscriptions (
         *                   id TEXT NOT NULL PRIMARY KEY,
         *                   userId TEXT NOT NULL,
         *                   role TEXT NOT NULL,
         *                   status TEXT NOT NULL,
         *                   trialEndsAt TEXT,
         *                   expiresAt TEXT
         *               )
         *           """.trimIndent())
         *       }
         *   }
         */
        val MIGRATIONS: Array<Migration> = arrayOf()
    }
}
