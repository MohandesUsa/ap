package com.truckaccounting.core.network

import com.truckaccounting.core.datastore.SecureTokenStorage
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

// Public endpoints that must NOT get an Authorization header attached — everything else
// (including GET /auth/me, which DOES require the access token) goes through normally.
private val PUBLIC_AUTH_PATHS = setOf("/auth/login", "/auth/register", "/auth/refresh", "/auth/logout")

/** Attaches `Authorization: Bearer <accessToken>` to every request except the public auth
 *  endpoints listed above. Actual 401 -> refresh -> retry is handled by [TokenAuthenticator],
 *  which is a separate OkHttp concept (Authenticator, not Interceptor) specifically because it
 *  needs to react to a completed 401 response, not just rewrite the outgoing request. */
class AuthInterceptor @Inject constructor(
    private val tokenStorage: SecureTokenStorage,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        if (original.url.encodedPath in PUBLIC_AUTH_PATHS) {
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
