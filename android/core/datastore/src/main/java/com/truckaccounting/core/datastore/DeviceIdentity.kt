package com.truckaccounting.core.datastore

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * A stable per-installation device id sent with every login/register call — the backend's
 * single-trusted-device rule keys on this (see backend/migrations/003_device_approval.sql):
 * the first device to log in becomes trusted, and a login from any other device id requires
 * approval from whichever device currently holds that trust.
 *
 * Deliberately a SEPARATE EncryptedSharedPreferences file from [SecureTokenStorage] — logging out
 * must NOT change this id (SecureTokenStorage.clear() wipes tokens, but the phone is still the
 * same physical device), or every re-login after a logout would look like a brand-new device and
 * require approval from itself, which is nonsensical.
 */
@Singleton
class DeviceIdentity @Inject constructor(
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
            "device_identity_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    suspend fun getOrCreateDeviceId(): String = withContext(Dispatchers.IO) {
        prefs.getString(KEY_DEVICE_ID, null) ?: UUID.randomUUID().toString().also { newId ->
            prefs.edit().putString(KEY_DEVICE_ID, newId).apply()
        }
    }

    private companion object {
        const val KEY_DEVICE_ID = "device_id"
    }
}
