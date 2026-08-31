package com.truckaccounting.feature.auth.data

import com.truckaccounting.core.datastore.SecureTokenStorage
import com.truckaccounting.core.datastore.UserPreferencesDataStore
import com.truckaccounting.feature.auth.domain.AuthRepository
import com.truckaccounting.feature.auth.domain.AuthSession
import com.truckaccounting.feature.auth.domain.LoginParams
import com.truckaccounting.feature.auth.domain.RegisterParams
import com.truckaccounting.feature.auth.domain.SubscriptionStatus
import com.truckaccounting.feature.auth.domain.UserRole
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Stands in for the real backend while it doesn't exist yet (Phase 1 §8). Simulates network
 * latency and returns a session exactly like [com.truckaccounting.core.network.AuthApi] would.
 *
 * Mirrors the HTML prototype's mock behaviour 1:1 (docs/prototype/index.html):
 *  - every login/register succeeds after a short delay,
 *  - a fresh session starts in the one-month free trial (Phase 2 addendum §11.10),
 *  - `currentSession()` re-derives subscription status from the cached "days used" counter so the
 *    UI can be exercised end-to-end without a backend.
 */
@Singleton
class FakeAuthRepository @Inject constructor(
    private val tokenStorage: SecureTokenStorage,
    private val preferences: UserPreferencesDataStore,
) : AuthRepository {

    override suspend fun login(params: LoginParams): Result<AuthSession> {
        delay(600) // simulate network round-trip so Loading states are exercised in the UI
        if (params.phoneNumber.isBlank() || params.password.isBlank()) {
            return Result.failure(IllegalArgumentException("شماره موبایل و رمز عبور را وارد کنید"))
        }
        return Result.success(mockSession(params.roleHint, fullNameOverride = null))
    }

    override suspend fun register(params: RegisterParams): Result<AuthSession> {
        delay(600)
        if (params.phoneNumber.isBlank() || params.password.isBlank() || params.fullName.isBlank()) {
            return Result.failure(IllegalArgumentException("همهٔ فیلدهای الزامی را پر کنید"))
        }
        return Result.success(mockSession(params.roleHint, fullNameOverride = params.fullName))
    }

    override suspend fun currentSession(): AuthSession? {
        val role = preferences.cachedRole.first() ?: return null
        return mockSession(UserRole.valueOf(role.uppercase()), fullNameOverride = null)
    }

    override suspend fun logout() {
        tokenStorage.clear()
        preferences.setCachedRole(null)
    }

    private suspend fun mockSession(role: UserRole, fullNameOverride: String?): AuthSession {
        tokenStorage.saveTokens(
            accessToken = "fake-access-${UUID.randomUUID()}",
            refreshToken = "fake-refresh-${UUID.randomUUID()}",
        )
        preferences.setCachedRole(role.name.lowercase())
        return AuthSession(
            userId = "fake-${role.name.lowercase()}-user",
            role = role,
            fullName = fullNameOverride ?: if (role == UserRole.OWNER) "صاحب کامیون" else "راننده",
            // Every fresh mock session starts mid-trial; there is no real clock to expire it
            // against in Phase 2 (no backend yet) — the prototype's "simulate trial end" pattern
            // is the intended way to exercise the paywall until real dates exist server-side.
            subscriptionStatus = SubscriptionStatus.TRIAL,
            trialDaysLeft = 30,
        )
    }
}
