package com.truckaccounting.feature.auth.data

import com.truckaccounting.core.datastore.SecureTokenStorage
import com.truckaccounting.core.datastore.UserPreferencesDataStore
import com.truckaccounting.core.network.AuthApi
import com.truckaccounting.core.network.LoginRequest
import com.truckaccounting.core.network.RegisterRequest
import com.truckaccounting.core.network.RefreshRequest
import com.truckaccounting.core.network.toAppError
import com.truckaccounting.feature.auth.domain.AuthRepository
import com.truckaccounting.feature.auth.domain.AuthSession
import com.truckaccounting.feature.auth.domain.LoginParams
import com.truckaccounting.feature.auth.domain.RegisterParams
import com.truckaccounting.feature.auth.domain.SubscriptionStatus
import com.truckaccounting.feature.auth.domain.UserRole
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Real implementation, calling the Phase 3 backend. This is the one-line swap Phase 1 §9 and the
 * AuthModule.kt doc comment described: [FakeAuthRepository] is still in this package (kept as a
 * reference / for future offline-UI-development use) but is no longer bound — see AuthModule.kt.
 */
@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val api: AuthApi,
    private val tokenStorage: SecureTokenStorage,
    private val preferences: UserPreferencesDataStore,
) : AuthRepository {

    override suspend fun login(params: LoginParams): Result<AuthSession> = runCatching {
        val response = api.login(LoginRequest(phoneNumber = params.phoneNumber, password = params.password))
        persistAndMap(response.accessToken, response.refreshToken, response.role, response.userId, response.fullName, response.subscriptionStatus, response.trialDaysLeft)
    }.recoverCatching { throw it.toAppError() }

    override suspend fun register(params: RegisterParams): Result<AuthSession> = runCatching {
        val response = api.register(
            RegisterRequest(
                phoneNumber = params.phoneNumber,
                password = params.password,
                fullName = params.fullName,
                role = params.roleHint.name.lowercase(),
                companyName = params.companyName,
                // NOTE: inviteCode is deliberately not sent here — see auth.routes.ts's comment:
                // accepting a specific invitation is its own explicit, separately-auditable step
                // (POST /driver/invitations/{id}/accept), not folded into registration.
            ),
        )
        persistAndMap(response.accessToken, response.refreshToken, response.role, response.userId, response.fullName, response.subscriptionStatus, response.trialDaysLeft)
    }.recoverCatching { throw it.toAppError() }

    override suspend fun currentSession(): AuthSession? {
        val accessToken = tokenStorage.getAccessToken() ?: return null
        return runCatching {
            val me = api.me()
            AuthSession(
                userId = me.userId,
                role = UserRole.valueOf(me.role.uppercase()),
                fullName = me.fullName,
                subscriptionStatus = me.subscriptionStatus.toSubscriptionStatus(),
                trialDaysLeft = me.trialDaysLeft,
            )
        }.getOrElse {
            // Access token invalid/expired and refresh also failed (TokenAuthenticator already
            // tried once) — no valid session. Clear stale local state so the next launch doesn't
            // repeat a doomed /auth/me call.
            tokenStorage.clear()
            preferences.setCachedRole(null)
            null
        }
    }

    override suspend fun logout() {
        val refreshToken = tokenStorage.getRefreshToken()
        if (refreshToken != null) {
            runCatching { api.logout(RefreshRequest(refreshToken)) } // best-effort — clear local state regardless
        }
        tokenStorage.clear()
        preferences.setCachedRole(null)
    }

    private suspend fun persistAndMap(
        accessToken: String,
        refreshToken: String,
        role: String,
        userId: String,
        fullName: String,
        subscriptionStatus: String,
        trialDaysLeft: Int?,
    ): AuthSession {
        tokenStorage.saveTokens(accessToken, refreshToken)
        preferences.setCachedRole(role.lowercase())
        return AuthSession(
            userId = userId,
            role = UserRole.valueOf(role.uppercase()),
            fullName = fullName,
            subscriptionStatus = subscriptionStatus.toSubscriptionStatus(),
            trialDaysLeft = trialDaysLeft,
        )
    }

    private fun String.toSubscriptionStatus(): SubscriptionStatus = when (this) {
        "active" -> SubscriptionStatus.ACTIVE
        "expired" -> SubscriptionStatus.EXPIRED
        else -> SubscriptionStatus.TRIAL
    }
}
