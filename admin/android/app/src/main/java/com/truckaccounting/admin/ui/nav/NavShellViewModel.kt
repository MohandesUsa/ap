package com.truckaccounting.admin.ui.nav

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.AdminSession
import com.truckaccounting.admin.data.MeResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Filters the 13-item nav to what `me`'s real backend permissions allow — pure, so callers pass
 *  the exact `me` value they observed via `collectAsState()` rather than re-reading a possibly
 *  stale StateFlow.value mid-recomposition. */
fun visibleNavItems(me: MeResponse?): List<NavItem> = NAV_ITEMS.filter { item ->
    item.requiredPermission == null || me?.permissions?.contains(item.requiredPermission) == true
}

@HiltViewModel
class NavShellViewModel @Inject constructor(
    private val repository: AdminRepository,
    session: AdminSession,
) : ViewModel() {

    val me: StateFlow<MeResponse?> = session.me

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            repository.logout()
            onDone()
        }
    }
}
