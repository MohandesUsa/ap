package com.truckaccounting.core.database

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import com.truckaccounting.core.database.dao.DriverDao
import com.truckaccounting.core.database.dao.TruckDao
import com.truckaccounting.core.database.dao.UserDao
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, AppDatabase.DATABASE_NAME)
            .addMigrations(*AppDatabase.MIGRATIONS)
            // No fallbackToDestructiveMigration() — see the migration note in AppDatabase.kt.
            .build()

    @Provides
    fun provideUserDao(db: AppDatabase): UserDao = db.userDao()

    @Provides
    fun provideTruckDao(db: AppDatabase): TruckDao = db.truckDao()

    @Provides
    fun provideDriverDao(db: AppDatabase): DriverDao = db.driverDao()
}
