package com.truckaccounting.feature.auth.domain

enum class UserRole { OWNER, DRIVER }

data class AuthSession(
    val userId: String,
    val role: UserRole,
    val fullName: String,
    val subscriptionStatus: SubscriptionStatus,
    val trialDaysLeft: Int?,
)

enum class SubscriptionStatus { TRIAL, ACTIVE, EXPIRED }

data class LoginParams(
    val phoneNumber: String,
    val password: String,
    val roleHint: UserRole,
)

data class RegisterParams(
    val phoneNumber: String,
    val password: String,
    val fullName: String,
    val roleHint: UserRole,
    val companyName: String? = null,
    val inviteCode: String? = null,
)

/**
 * Repository Pattern per Phase 1 §9 (UI -> ViewModel -> UseCase -> Repository -> Data Source).
 * [FakeAuthRepository] is the only implementation wired up in Phase 2 (Hilt binds it in
 * AuthModule); a future `AuthRepositoryImpl` backed by [com.truckaccounting.core.network.AuthApi]
 * implements this exact same interface and swaps in with a one-line @Binds change — no ViewModel
 * or Composable needs to change.
 */
interface AuthRepository {
    suspend fun login(params: LoginParams): Result<AuthSession>
    suspend fun register(params: RegisterParams): Result<AuthSession>
    suspend fun currentSession(): AuthSession?
    suspend fun logout()
}
