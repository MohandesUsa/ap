package com.truckaccounting.core.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_preferences")

/**
 * Ordinary (unencrypted) preferences: theme mode, currency display unit, cached user role.
 *
 * IMPORTANT (Phase 1 §12): this class must never be used to store access/refresh tokens — those
 * live in [SecureTokenStorage] (Keystore-backed EncryptedSharedPreferences) instead. The `role`
 * cached here is only a UI-convenience hint (e.g. to skip the role-selection screen on relaunch);
 * it is NOT the source of truth for authorization — every API call is still authorized server-side
 * against the JWT's role claim (Phase 1 §6, §9).
 */
@Singleton
class UserPreferencesDataStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private object Keys {
        val THEME_MODE = stringPreferencesKey("theme_mode") // "light" | "dark" | "system"
        val CURRENCY_UNIT = stringPreferencesKey("currency_unit") // "toman" | "rial"
        val CACHED_ROLE = stringPreferencesKey("cached_role") // "owner" | "driver" | null
    }

    val themeMode: Flow<String> = context.dataStore.data.map { it[Keys.THEME_MODE] ?: "system" }
    val currencyUnit: Flow<String> = context.dataStore.data.map { it[Keys.CURRENCY_UNIT] ?: "rial" }
    val cachedRole: Flow<String?> = context.dataStore.data.map { it[Keys.CACHED_ROLE] }

    suspend fun setThemeMode(mode: String) {
        context.dataStore.edit { it[Keys.THEME_MODE] = mode }
    }

    suspend fun setCurrencyUnit(unit: String) {
        context.dataStore.edit { it[Keys.CURRENCY_UNIT] = unit }
    }

    suspend fun setCachedRole(role: String?) {
        context.dataStore.edit {
            if (role == null) it.remove(Keys.CACHED_ROLE) else it[Keys.CACHED_ROLE] = role
        }
    }
}
