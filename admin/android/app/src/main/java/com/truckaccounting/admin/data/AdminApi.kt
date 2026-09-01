package com.truckaccounting.admin.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class LoginRequest(val phoneNumber: String, val password: String)

data class AdminSummary(val id: String, val fullName: String, val phoneNumber: String, val role: String)

data class LoginResponse(val accessToken: String, val expiresInSeconds: Int, val admin: AdminSummary)

data class MeResponse(val id: String, val fullName: String, val phoneNumber: String, val role: String, val permissions: List<String>)

data class UsersSection(val total: Int, val active: Int, val newToday: Int, val newThisMonth: Int)
data class FleetSection(val totalOwners: Int, val totalDrivers: Int, val totalTrucks: Int)
data class SubscriptionsSection(val active: Int, val expired: Int)
data class RevenueSection(val today: Long, val thisMonth: Long, val thisYear: Long)
data class PaymentsSection(val successful: Int, val failed: Int, val pending: Int)

data class DashboardResponse(
    val users: UsersSection,
    val fleet: FleetSection,
    val subscriptions: SubscriptionsSection,
    val revenue: RevenueSection,
    val payments: PaymentsSection,
)

data class UserListItem(
    val id: String,
    val phone_number: String,
    val role: String,
    val is_active: Int,
    val created_at: String,
    val full_name: String?,
)
data class PaginationInfo(val page: Int, val limit: Int, val total: Int)
data class UsersResponse(val users: List<UserListItem>, val pagination: PaginationInfo)

/**
 * Retrofit surface for the endpoints this app's ViewModels actually call (Login/Dashboard/Users
 * list — see admin/README.md's "Known Limitations" for the rest of the 39-phase API surface that
 * the BACKEND already implements and tests, real Endpoints ready for a
 * ViewModel/Screen to be added the same way as these).
 */
interface AdminApi {
    @POST("admin/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("admin/auth/me")
    suspend fun me(): MeResponse

    @GET("admin/dashboard")
    suspend fun dashboard(): DashboardResponse

    @GET("admin/users")
    suspend fun users(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20, @Query("search") search: String? = null): UsersResponse
}
