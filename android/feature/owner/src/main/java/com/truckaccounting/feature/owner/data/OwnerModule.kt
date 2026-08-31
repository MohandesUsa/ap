package com.truckaccounting.feature.owner.data

import com.truckaccounting.feature.owner.domain.DriverRepository
import com.truckaccounting.feature.owner.domain.TruckRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class OwnerModule {
    @Binds
    @Singleton
    abstract fun bindTruckRepository(impl: TruckRepositoryImpl): TruckRepository

    @Binds
    @Singleton
    abstract fun bindDriverRepository(impl: DriverRepositoryImpl): DriverRepository
}
