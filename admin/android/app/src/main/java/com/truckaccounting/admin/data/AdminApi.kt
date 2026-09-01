package com.truckaccounting.admin.data

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
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

data class SuccessResponse(val success: Boolean)
data class PaginationInfo(val page: Int, val limit: Int, val total: Int)

// --- Users (Phase 5) ---

data class UserListItem(
    val id: String,
    val phone_number: String,
    val role: String,
    val is_active: Int,
    val created_at: String,
    val full_name: String?,
)
data class UsersResponse(val users: List<UserListItem>, val pagination: PaginationInfo)

data class TruckRow(
    val id: String, val owner_id: String, val plate: String, val brand: String,
    val model_year: String, val status: String, val created_at: String, val updated_at: String,
)
data class TripRow(
    val id: String, val truck_id: String, val driver_id: String, val origin: String,
    val destination: String, val cargo_type: String?, val cargo_weight: String?,
    val income: Double, val commission: Double, val trip_date: String,
)
data class ExpenseRow(
    val id: String, val owner_id: String?, val driver_id: String?, val truck_id: String?,
    val category: String?, val amount: Double, val description: String?, val expense_date: String,
    val created_at: String,
)
data class DriverForOwner(
    val driver_id: String, val full_name: String, val pay_type: String, val pay_value: Double,
    val truck_id: String?, val plate: String?,
)

/** Mirrors admin-directory.routes.ts's `{ ...user, ...extra }` shape: `extra` only carries the
 *  owner-branch fields OR the driver-branch fields, never both — the unused side is null here. */
data class UserDetail(
    val id: String,
    val phone_number: String,
    val role: String,
    val is_active: Int,
    val created_at: String,
    val full_name: String?,
    val company_name: String?,
    val owner_id: String?,
    val driver_id: String?,
    val trucks: List<TruckRow>? = null,
    val drivers: List<DriverForOwner>? = null,
    val tripCount: Int? = null,
    val expenseCount: Int? = null,
    val activeTruckId: String? = null,
)

// --- Owners (Phase 6) ---

data class OwnerListItem(
    val id: String, val full_name: String, val company_name: String?, val created_at: String,
    val phone_number: String, val is_active: Int, val truck_count: Int, val driver_count: Int,
    val subscription_status: String?,
)
data class OwnersResponse(val owners: List<OwnerListItem>, val pagination: PaginationInfo)

data class OwnerDetail(
    val id: String, val full_name: String, val company_name: String?, val created_at: String,
    val user_id: String, val phone_number: String, val is_active: Int,
    val trucks: List<TruckRow>, val drivers: List<DriverForOwner>, val trips: List<TripRow>,
    val expenses: List<ExpenseRow>, val totalIncome: Double, val totalExpense: Double,
)

// --- Drivers (Phase 7) ---

data class DriverListItem(
    val id: String, val full_name: String, val pay_type: String, val pay_value: Double,
    val created_at: String, val phone_number: String, val is_active: Int,
    val truck_id: String?, val truck_plate: String?, val owner_name: String?, val owner_id: String?,
    val connection_status: String?,
)
data class DriversResponse(val drivers: List<DriverListItem>, val pagination: PaginationInfo)

data class DriverDetail(
    val id: String, val full_name: String, val pay_type: String, val pay_value: Double,
    val created_at: String, val user_id: String, val phone_number: String, val is_active: Int,
    val activeTruckId: String?, val trips: List<TripRow>, val expenses: List<ExpenseRow>,
    val totalIncome: Double, val totalExpense: Double,
)

// --- Trucks (Phase 8) ---

data class TruckListItem(
    val id: String, val plate: String, val brand: String, val model_year: String,
    val status: String, val created_at: String, val owner_id: String, val owner_name: String,
    val driver_id: String?, val driver_name: String?,
)
data class TrucksResponse(val trucks: List<TruckListItem>, val pagination: PaginationInfo)

data class TruckDetail(
    val id: String, val plate: String, val brand: String, val model_year: String,
    val status: String, val created_at: String, val owner_id: String, val owner_name: String,
    val trips: List<TripRow>, val totalIncome: Double,
)

data class UpdateUserStatusRequest(val isActive: Boolean)

// --- Subscription plans (Phase 10) ---

data class PlanResponse(
    val id: String, val name: String, val durationDays: Int, val price: Long,
    val description: String?, val isActive: Boolean,
)
data class PlansResponse(val plans: List<PlanResponse>)
data class CreatePlanRequest(val name: String, val durationDays: Int, val price: Long, val description: String? = null)
data class UpdatePlanRequest(
    val name: String? = null, val durationDays: Int? = null, val price: Long? = null,
    val description: String? = null, val isActive: Boolean? = null,
)

// --- Subscriptions / Orders / Payments / Revenue (Phases 9, 11, 12, 13) ---

data class SubscriptionRow(
    val id: String, val owner_id: String, val plan_id: String, val status: String,
    val started_at: String?, val expires_at: String?, val created_at: String,
    val owner_name: String, val plan_name: String,
)
data class SubscriptionsResponse(val subscriptions: List<SubscriptionRow>, val pagination: PaginationInfo)

data class OrderRow(
    val id: String, val owner_id: String, val plan_id: String, val subscription_id: String?,
    val amount: Long, val status: String, val created_at: String, val updated_at: String,
    val owner_name: String, val plan_name: String,
)
data class OrdersResponse(val orders: List<OrderRow>, val pagination: PaginationInfo)

data class SubscriptionPaymentRow(
    val id: String, val order_id: String, val amount: Long, val provider: String,
    val status: String, val reference_id: String?, val created_at: String,
    val owner_id: String, val owner_name: String, val plan_id: String, val plan_name: String,
)
data class PaymentsResponse(val payments: List<SubscriptionPaymentRow>, val pagination: PaginationInfo)

data class RevenueResponse(
    val today: Long, val thisMonth: Long, val thisYear: Long, val allTime: Long,
    val paymentCounts: Map<String, Int>,
)

// --- Settings: SMS / Payment / System / Feature flags (Phases 14, 15, 17, 18) ---

data class SmsSettingsResponse(
    val provider: String, val username: String?, val apiKey: String?,
    val sender: String?, val template: String?,
)
data class SmsSettingsUpdateRequest(
    val username: String? = null, val password: String? = null, val apiKey: String? = null,
    val sender: String? = null, val template: String? = null,
)
data class ConnectionTestResult(val connected: Boolean, val detail: String)
data class SendTestSmsRequest(val to: String)
data class SendSmsResult(val sent: Boolean, val detail: String)

data class PaymentSettingsResponse(
    val provider: String, val merchantId: String?, val apiKey: String?, val sandbox: Boolean,
)
data class PaymentSettingsUpdateRequest(
    val merchantId: String? = null, val apiKey: String? = null, val sandbox: Boolean? = null,
)

data class SystemSettingsResponse(
    val app_name: String?, val support_phone: String?, val support_email: String?,
    val terms_url: String?, val privacy_url: String?, val maintenance_mode: String?,
    val min_app_version: String?, val latest_app_version: String?,
)

data class FeatureFlagUpdateRequest(val enabled: Boolean)

// --- Notifications (Phase 27) ---

data class NotificationRow(
    val id: String, val title: String, val message: String, val target: String,
    val target_user_id: String?, val created_by: String, val created_at: String,
)
data class NotificationsResponse(val notifications: List<NotificationRow>)
data class CreateNotificationRequest(
    val title: String, val message: String, val target: String, val targetUserId: String? = null,
)
data class NotificationCreated(
    val id: String, val title: String, val message: String, val target: String,
    val target_user_id: String?, val created_by: String, val created_at: String,
    val recipientCount: Int,
)

// --- Audit logs (Phase 20) ---

data class AuditLogRow(
    val id: String, val user_id: String?, val admin_id: String?, val action: String,
    val entity_type: String?, val entity_id: String?, val old_value: String?,
    val new_value: String?, val ip_address: String?, val created_at: String,
)
data class AuditLogsResponse(val logs: List<AuditLogRow>)

// --- Admin management (Phase 21, SUPER_ADMIN only) ---

data class AdminAccount(
    val id: String, val phoneNumber: String, val fullName: String, val role: String,
    val isActive: Boolean, val createdAt: String,
)
data class AdminsResponse(val admins: List<AdminAccount>)
data class CreateAdminRequest(val phoneNumber: String, val password: String, val fullName: String, val role: String)
data class UpdateAdminRequest(
    val fullName: String? = null, val role: String? = null, val isActive: Boolean? = null,
)
data class GrantPermissionRequest(val permission: String)

/**
 * Retrofit surface for every endpoint the backend implements and tests (see admin/README.md).
 * Field casing intentionally mirrors the backend's actual JSON exactly per-endpoint — most
 * directory/subscription/audit/notification rows are raw snake_case SQL results, while
 * auth/dashboard/plan/admin-management/revenue responses are camelCase — there is no
 * @SerializedName mapping layer, so Gson requires the Kotlin property name to match the wire
 * field name letter-for-letter.
 */
interface AdminApi {
    @POST("admin/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @GET("admin/auth/me")
    suspend fun me(): MeResponse

    @GET("admin/dashboard")
    suspend fun dashboard(): DashboardResponse

    // --- Users ---
    @GET("admin/users")
    suspend fun users(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20, @Query("search") search: String? = null): UsersResponse

    @GET("admin/users/{id}")
    suspend fun userDetail(@Path("id") id: String): UserDetail

    @PUT("admin/users/{id}/status")
    suspend fun setUserStatus(@Path("id") id: String, @Body body: UpdateUserStatusRequest): SuccessResponse

    // --- Owners ---
    @GET("admin/owners")
    suspend fun owners(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20): OwnersResponse

    @GET("admin/owners/{id}")
    suspend fun ownerDetail(@Path("id") id: String): OwnerDetail

    // --- Drivers ---
    @GET("admin/drivers")
    suspend fun drivers(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20): DriversResponse

    @GET("admin/drivers/{id}")
    suspend fun driverDetail(@Path("id") id: String): DriverDetail

    // --- Trucks ---
    @GET("admin/trucks")
    suspend fun trucks(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20): TrucksResponse

    @GET("admin/trucks/{id}")
    suspend fun truckDetail(@Path("id") id: String): TruckDetail

    // --- Subscription plans ---
    @GET("admin/subscription-plans")
    suspend fun plans(): PlansResponse

    @POST("admin/subscription-plans")
    suspend fun createPlan(@Body body: CreatePlanRequest): PlanResponse

    @PUT("admin/subscription-plans/{id}")
    suspend fun updatePlan(@Path("id") id: String, @Body body: UpdatePlanRequest): PlanResponse

    // --- Subscriptions / Orders / Payments / Revenue ---
    @GET("admin/subscriptions")
    suspend fun subscriptions(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20, @Query("status") status: String? = null): SubscriptionsResponse

    @GET("admin/orders")
    suspend fun orders(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20, @Query("status") status: String? = null): OrdersResponse

    @GET("admin/payments")
    suspend fun payments(@Query("page") page: Int = 1, @Query("limit") limit: Int = 20, @Query("status") status: String? = null): PaymentsResponse

    @GET("admin/revenue")
    suspend fun revenue(): RevenueResponse

    // --- Settings ---
    @GET("admin/settings/sms")
    suspend fun smsSettings(): SmsSettingsResponse

    @PUT("admin/settings/sms")
    suspend fun updateSmsSettings(@Body body: SmsSettingsUpdateRequest): SuccessResponse

    @POST("admin/settings/sms/test-connection")
    suspend fun testSmsConnection(): ConnectionTestResult

    @POST("admin/settings/sms/send-test")
    suspend fun sendTestSms(@Body body: SendTestSmsRequest): SendSmsResult

    @GET("admin/settings/payment")
    suspend fun paymentSettings(): PaymentSettingsResponse

    @PUT("admin/settings/payment")
    suspend fun updatePaymentSettings(@Body body: PaymentSettingsUpdateRequest): SuccessResponse

    @POST("admin/settings/payment/test-connection")
    suspend fun testPaymentConnection(): ConnectionTestResult

    @GET("admin/settings/system")
    suspend fun systemSettings(): SystemSettingsResponse

    @PUT("admin/settings/system")
    suspend fun updateSystemSettings(@Body body: Map<String, String>): SuccessResponse

    @GET("admin/settings/feature-flags")
    suspend fun featureFlags(): Map<String, Boolean>

    @PUT("admin/settings/feature-flags/{key}")
    suspend fun updateFeatureFlag(@Path("key") key: String, @Body body: FeatureFlagUpdateRequest): SuccessResponse

    // --- Notifications ---
    @GET("admin/notifications")
    suspend fun notifications(): NotificationsResponse

    @POST("admin/notifications")
    suspend fun createNotification(@Body body: CreateNotificationRequest): NotificationCreated

    // --- Audit logs ---
    @GET("admin/audit-logs")
    suspend fun auditLogs(@Query("adminId") adminId: String? = null, @Query("limit") limit: Int = 100): AuditLogsResponse

    // --- Admin management (SUPER_ADMIN) ---
    @GET("admin/admins")
    suspend fun admins(): AdminsResponse

    @POST("admin/admins")
    suspend fun createAdmin(@Body body: CreateAdminRequest): AdminAccount

    @PUT("admin/admins/{id}")
    suspend fun updateAdmin(@Path("id") id: String, @Body body: UpdateAdminRequest): AdminAccount

    @POST("admin/admins/{id}/permissions")
    suspend fun grantPermission(@Path("id") id: String, @Body body: GrantPermissionRequest): SuccessResponse

    @DELETE("admin/admins/{id}/permissions/{permission}")
    suspend fun revokePermission(@Path("id") id: String, @Path("permission") permission: String): SuccessResponse
}
