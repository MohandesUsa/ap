package com.truckaccounting.admin.data

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminRepository @Inject constructor(
    private val api: AdminApi,
    private val tokenStorage: AdminTokenStorage,
    private val session: AdminSession,
) {
    suspend fun login(phoneNumber: String, password: String): AdminSummary {
        val response = api.login(LoginRequest(phoneNumber, password))
        tokenStorage.saveSession(response.accessToken, response.admin.role, response.admin.fullName)
        // LoginResponse.admin carries no `permissions` field — fetch it right away so the nav
        // drawer can filter its items before the admin's first screen even renders.
        session.set(runCatching { api.me() }.getOrNull())
        return response.admin
    }

    suspend fun currentSession(): MeResponse? {
        if (tokenStorage.getAccessToken() == null) return null
        val me = runCatching { api.me() }.getOrNull()
        session.set(me)
        return me
    }

    suspend fun dashboard(): DashboardResponse = api.dashboard()

    // --- Users ---
    suspend fun users(page: Int = 1, search: String? = null): UsersResponse = api.users(page = page, search = search)
    suspend fun userDetail(id: String): UserDetail = api.userDetail(id)
    suspend fun setUserActive(id: String, isActive: Boolean): SuccessResponse = api.setUserStatus(id, UpdateUserStatusRequest(isActive))

    // --- Owners ---
    suspend fun owners(page: Int = 1): OwnersResponse = api.owners(page = page)
    suspend fun ownerDetail(id: String): OwnerDetail = api.ownerDetail(id)

    // --- Drivers ---
    suspend fun drivers(page: Int = 1): DriversResponse = api.drivers(page = page)
    suspend fun driverDetail(id: String): DriverDetail = api.driverDetail(id)

    // --- Trucks ---
    suspend fun trucks(page: Int = 1): TrucksResponse = api.trucks(page = page)
    suspend fun truckDetail(id: String): TruckDetail = api.truckDetail(id)

    // --- Subscription plans ---
    suspend fun plans(): PlansResponse = api.plans()
    suspend fun createPlan(name: String, durationDays: Int, price: Long, description: String?): PlanResponse =
        api.createPlan(CreatePlanRequest(name, durationDays, price, description))
    suspend fun updatePlan(id: String, body: UpdatePlanRequest): PlanResponse = api.updatePlan(id, body)

    // --- Subscriptions / Orders / Payments / Revenue ---
    suspend fun subscriptions(page: Int = 1, status: String? = null): SubscriptionsResponse = api.subscriptions(page = page, status = status)
    suspend fun orders(page: Int = 1, status: String? = null): OrdersResponse = api.orders(page = page, status = status)
    suspend fun payments(page: Int = 1, status: String? = null): PaymentsResponse = api.payments(page = page, status = status)
    suspend fun revenue(): RevenueResponse = api.revenue()

    // --- Settings ---
    suspend fun smsSettings(): SmsSettingsResponse = api.smsSettings()
    suspend fun updateSmsSettings(body: SmsSettingsUpdateRequest): SuccessResponse = api.updateSmsSettings(body)
    suspend fun testSmsConnection(): ConnectionTestResult = api.testSmsConnection()
    suspend fun sendTestSms(to: String): SendSmsResult = api.sendTestSms(SendTestSmsRequest(to))

    suspend fun paymentSettings(): PaymentSettingsResponse = api.paymentSettings()
    suspend fun updatePaymentSettings(body: PaymentSettingsUpdateRequest): SuccessResponse = api.updatePaymentSettings(body)
    suspend fun testPaymentConnection(): ConnectionTestResult = api.testPaymentConnection()

    suspend fun systemSettings(): SystemSettingsResponse = api.systemSettings()
    suspend fun updateSystemSettings(values: Map<String, String>): SuccessResponse = api.updateSystemSettings(values)

    suspend fun featureFlags(): Map<String, Boolean> = api.featureFlags()
    suspend fun updateFeatureFlag(key: String, enabled: Boolean): SuccessResponse = api.updateFeatureFlag(key, FeatureFlagUpdateRequest(enabled))

    // --- Notifications ---
    suspend fun notifications(): NotificationsResponse = api.notifications()
    suspend fun createNotification(title: String, message: String, target: String, targetUserId: String?): NotificationCreated =
        api.createNotification(CreateNotificationRequest(title, message, target, targetUserId))

    // --- Audit logs ---
    suspend fun auditLogs(adminId: String? = null, limit: Int = 100): AuditLogsResponse = api.auditLogs(adminId, limit)

    // --- Admin management ---
    suspend fun admins(): AdminsResponse = api.admins()
    suspend fun createAdmin(phoneNumber: String, password: String, fullName: String, role: String): AdminAccount =
        api.createAdmin(CreateAdminRequest(phoneNumber, password, fullName, role))
    suspend fun updateAdmin(id: String, body: UpdateAdminRequest): AdminAccount = api.updateAdmin(id, body)
    suspend fun grantPermission(adminId: String, permission: String): SuccessResponse = api.grantPermission(adminId, GrantPermissionRequest(permission))
    suspend fun revokePermission(adminId: String, permission: String): SuccessResponse = api.revokePermission(adminId, permission)

    suspend fun logout() {
        tokenStorage.clear()
        session.set(null)
    }
}
