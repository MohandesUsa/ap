package com.truckaccounting.admin.data

import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

private val PUBLIC_PATHS = setOf("/admin/auth/login")

/** Attaches `Authorization: Bearer <adminAccessToken>` to every request except login itself.
 *  Same shape as the User App's AuthInterceptor (android/core/network) — this app's token is a
 *  DIFFERENT one, signed with the backend's separate ADMIN_JWT_SECRET, so it is only ever valid
 *  against /admin/* routes (see backend/src/modules/admin-auth/admin.middleware.ts). */
class AdminAuthInterceptor @Inject constructor(
    private val tokenStorage: AdminTokenStorage,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        if (original.url.encodedPath in PUBLIC_PATHS) {
            return chain.proceed(original)
        }
        val token = runBlocking { tokenStorage.getAccessToken() }
        val authorized = if (token != null) {
            original.newBuilder().addHeader("Authorization", "Bearer $token").build()
        } else {
            original
        }
        return chain.proceed(authorized)
    }
}
