package com.truckaccounting.feature.auth.data

import com.truckaccounting.feature.auth.domain.AuthRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Phase 3: switched from FakeAuthRepository to the real AuthRepositoryImpl (backed by AuthApi
 * against the Phase 3 backend), exactly the one-line change Phase 1 §9 and Phase 2's doc comment
 * on this file predicted. FakeAuthRepository itself is untouched and still compiles — kept around
 * as a reference implementation and for any future offline-UI-development needs — it's just no
 * longer the one Hilt injects.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class AuthModule {
    @Binds
    @Singleton
    abstract fun bindAuthRepository(impl: AuthRepositoryImpl): AuthRepository
}
