package com.truckaccounting.core.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Matches the real backend implemented in Phase 3 (backend/src/modules/auth/auth.routes.ts)
 * field-for-field. Phase 2's FakeAuthRepository is still present (see feature:auth) but no
 * longer bound — AuthRepositoryImpl now implements the same domain interface against this API.
 */
interface AuthApi {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/refresh")
    suspend fun refresh(@Body request: RefreshRequest): RefreshResponse

    @POST("auth/logout")
    suspend fun logout(@Body request: RefreshRequest)

    @GET("auth/me")
    suspend fun me(): CurrentUserResponse
}

data class LoginRequest(
    val phoneNumber: String,
    val password: String,
    val deviceId: String,
)

data class RegisterRequest(
    val phoneNumber: String,
    val password: String,
    val fullName: String,
    val role: String,
    val companyName: String? = null,
    val deviceId: String,
)

data class RefreshRequest(val refreshToken: String)

data class RefreshResponse(
    val accessToken: String,
    val refreshToken: String,
)

/**
 * `status` is always present: `"authenticated"` (the normal case — every other field is then
 * present too) or `"pending_approval"` (a login from a device other than this account's trusted
 * one; only `requestId` is present, and no tokens are issued). The token/profile fields are
 * therefore nullable — never force-unwrap them without checking `status` first (see
 * AuthRepositoryImpl.persistAndMap's guard).
 */
data class AuthResponse(
    val status: String,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val userId: String? = null,
    val role: String? = null, // authoritative role, returned by the server — Phase 1 §6 / Phase 3 §10
    val fullName: String? = null,
    val phoneNumber: String? = null,
    val subscriptionStatus: String? = null, // "trial" | "active" | "expired" — Phase 2 addendum §11.10
    val trialDaysLeft: Int? = null,
    val requestId: String? = null,
)

data class CurrentUserResponse(
    val userId: String,
    val role: String,
    val fullName: String,
    val phoneNumber: String,
    val subscriptionStatus: String,
    val trialDaysLeft: Int?,
)
