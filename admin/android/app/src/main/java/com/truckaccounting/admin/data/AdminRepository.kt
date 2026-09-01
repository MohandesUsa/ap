package com.truckaccounting.admin.data

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminRepository @Inject constructor(
    private val api: AdminApi,
    private val tokenStorage: AdminTokenStorage,
) {
    suspend fun login(phoneNumber: String, password: String): AdminSummary {
        val response = api.login(LoginRequest(phoneNumber, password))
        tokenStorage.saveSession(response.accessToken, response.admin.role, response.admin.fullName)
        return response.admin
    }

    suspend fun currentSession(): MeResponse? {
        if (tokenStorage.getAccessToken() == null) return null
        return runCatching { api.me() }.getOrNull()
    }

    suspend fun dashboard(): DashboardResponse = api.dashboard()

    suspend fun users(page: Int = 1, search: String? = null): UsersResponse = api.users(page = page, search = search)

    suspend fun logout() = tokenStorage.clear()
}
