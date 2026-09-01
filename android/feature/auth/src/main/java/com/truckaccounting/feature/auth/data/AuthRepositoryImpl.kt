package com.truckaccounting.feature.auth.data

import com.truckaccounting.core.common.AppError
import com.truckaccounting.core.datastore.DeviceIdentity
import com.truckaccounting.core.datastore.SecureTokenStorage
import com.truckaccounting.core.datastore.UserPreferencesDataStore
import com.truckaccounting.core.network.AuthApi
import com.truckaccounting.core.network.AuthResponse
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
    private val deviceIdentity: DeviceIdentity,
) : AuthRepository {

    override suspend fun login(params: LoginParams): Result<AuthSession> = runCatching {
        val deviceId = deviceIdentity.getOrCreateDeviceId()
        val response = api.login(LoginRequest(phoneNumber = params.phoneNumber, password = params.password, deviceId = deviceId))
        persistAndMap(response)
    }.recoverCatching { throw if (it is AppError) it else it.toAppError() }

    override suspend fun register(params: RegisterParams): Result<AuthSession> = runCatching {
        val deviceId = deviceIdentity.getOrCreateDeviceId()
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
                deviceId = deviceId,
            ),
        )
        persistAndMap(response)
    }.recoverCatching { throw if (it is AppError) it else it.toAppError() }

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

    /**
     * `status == "pending_approval"` means this login was from a device other than the account's
     * currently trusted one — no tokens were issued, and approving/denying it only happens from
     * whichever device IS currently trusted (not built into this app yet; the two web front ends
     * — web/index.html and admin/admin-preview.html's backend — are what currently expose that
     * flow). Surfacing this as a Validation error is deliberately the whole scope here: a user
     * hitting it sees a clear message instead of a crash, rather than this app growing a full
     * "approve from my other device" UI in the same pass as the backend feature itself.
     */
    private suspend fun persistAndMap(response: AuthResponse): AuthSession {
        if (response.status == "pending_approval") {
            throw AppError.Validation(
                "این ورود از یک دستگاه جدید انجام شده و نیاز به تأیید از دستگاهی دارد که هم‌اکنون با این حساب وارد است.",
            )
        }
        val accessToken = requireNotNull(response.accessToken)
        val refreshToken = requireNotNull(response.refreshToken)
        val role = requireNotNull(response.role)
        val userId = requireNotNull(response.userId)
        val fullName = requireNotNull(response.fullName)
        val subscriptionStatus = requireNotNull(response.subscriptionStatus)

        tokenStorage.saveTokens(accessToken, refreshToken)
        preferences.setCachedRole(role.lowercase())
        return AuthSession(
            userId = userId,
            role = UserRole.valueOf(role.uppercase()),
            fullName = fullName,
            subscriptionStatus = subscriptionStatus.toSubscriptionStatus(),
            trialDaysLeft = response.trialDaysLeft,
        )
    }

    private fun String.toSubscriptionStatus(): SubscriptionStatus = when (this) {
        "active" -> SubscriptionStatus.ACTIVE
        "expired" -> SubscriptionStatus.EXPIRED
        else -> SubscriptionStatus.TRIAL
    }
}
