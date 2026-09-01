package com.truckaccounting.admin.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Stores the admin's access token via the Android Keystore (EncryptedSharedPreferences) — same
 * approach as the User App's SecureTokenStorage (android/core/datastore), never plain
 * SharedPreferences. Only an access token: this project's admin auth is access-token-only, no
 * refresh rotation (see admin/README.md's Known Limitations) — a session simply expires after
 * ADMIN_ACCESS_TOKEN_TTL_SECONDS and the admin logs in again, rather than silently refreshing.
 */
@Singleton
class AdminTokenStorage @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val masterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val prefs by lazy {
        EncryptedSharedPreferences.create(
            context,
            "admin_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    suspend fun saveSession(accessToken: String, role: String, fullName: String) = withContext(Dispatchers.IO) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_ROLE, role)
            .putString(KEY_FULL_NAME, fullName)
            .apply()
    }

    suspend fun getAccessToken(): String? = withContext(Dispatchers.IO) { prefs.getString(KEY_ACCESS_TOKEN, null) }
    suspend fun getRole(): String? = withContext(Dispatchers.IO) { prefs.getString(KEY_ROLE, null) }
    suspend fun getFullName(): String? = withContext(Dispatchers.IO) { prefs.getString(KEY_FULL_NAME, null) }

    suspend fun clear() = withContext(Dispatchers.IO) { prefs.edit().clear().apply() }

    private companion object {
        const val KEY_ACCESS_TOKEN = "admin_access_token"
        const val KEY_ROLE = "admin_role"
        const val KEY_FULL_NAME = "admin_full_name"
    }
}
