package com.truckaccounting.core.network

import com.truckaccounting.core.datastore.SecureTokenStorage
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import retrofit2.Retrofit
import javax.inject.Inject
import javax.inject.Provider

/**
 * Implements Phase 3 §12/§14's real refresh flow on the Android side: when any request gets a
 * 401, this fires exactly once, calls POST /auth/refresh with the stored refresh token, saves the
 * new token pair, and retries the original request with the new access token. If the refresh
 * itself fails (refresh token also expired/revoked), returns null — OkHttp then surfaces the
 * original 401 to the caller, which the app treats as "session expired, go to Role Selection"
 * (see SplashViewModel / AppNavHost's session-check flow).
 *
 * `retrofitProvider` is a [Provider] rather than a direct [AuthApi] injection to break the
 * dependency cycle: NetworkModule builds AuthApi FROM the OkHttpClient that this Authenticator is
 * itself installed into — Hilt's Provider<T> defers resolution until first use, after the whole
 * graph is assembled, which resolves the cycle cleanly.
 */
class TokenAuthenticator @Inject constructor(
    private val tokenStorage: SecureTokenStorage,
    private val retrofitProvider: Provider<Retrofit>,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        if (response.request.url.encodedPath.startsWith("/auth/")) return null

        return runBlocking {
            val refreshToken = tokenStorage.getRefreshToken() ?: return@runBlocking null
            val authApi = retrofitProvider.get().create(AuthApi::class.java)
            val newTokens = runCatching { authApi.refresh(RefreshRequest(refreshToken)) }.getOrNull()
                ?: return@runBlocking null

            tokenStorage.saveTokens(newTokens.accessToken, newTokens.refreshToken)
            response.request.newBuilder()
                .header("Authorization", "Bearer ${newTokens.accessToken}")
                .build()
        }
    }

    private fun responseCount(response: Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}
