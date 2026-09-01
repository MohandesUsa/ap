package com.truckaccounting.admin.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * In-memory holder for the logged-in admin's role/permissions (from `/admin/auth/me`), so the
 * navigation drawer can filter its 13 destinations by `MeResponse.permissions` the same way
 * admin-preview.html's `hasPerm()`/`NAV_ITEMS` does — never persisted to disk, since permissions
 * can be granted/revoked server-side at any time and must be re-fetched, not cached across app
 * restarts (AdminRepository.currentSession() re-populates this on cold start via api.me()).
 */
@Singleton
class AdminSession @Inject constructor() {
    private val _me = MutableStateFlow<MeResponse?>(null)
    val me: StateFlow<MeResponse?> = _me.asStateFlow()

    fun set(me: MeResponse?) {
        _me.value = me
    }

    fun hasPermission(permission: String): Boolean = _me.value?.permissions?.contains(permission) == true
}
