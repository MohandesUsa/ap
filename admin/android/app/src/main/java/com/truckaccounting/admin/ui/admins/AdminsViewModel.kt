package com.truckaccounting.admin.ui.admins

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminAccount
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.UpdateAdminRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AdminsUiState {
    data object Loading : AdminsUiState
    data class Success(val admins: List<AdminAccount>) : AdminsUiState
    data class Error(val message: String) : AdminsUiState
}

/** Phase 21: this whole screen is only ever reachable when the drawer shows it, which only
 *  happens when the logged-in admin's `/admin/auth/me` permissions include ADMIN_MANAGEMENT —
 *  but every write here is re-checked server-side regardless (requirePermission(db,
 *  'ADMIN_MANAGEMENT') on each route), so a client-side bypass can never actually create or
 *  modify an admin account. */
@HiltViewModel
class AdminsViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<AdminsUiState>(AdminsUiState.Loading)
    val state: StateFlow<AdminsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = AdminsUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                AdminsUiState.Success(repository.admins().admins)
            } catch (e: Exception) {
                AdminsUiState.Error(e.message ?: "خطا در دریافت ادمین‌ها")
            }
        }
    }

    fun createAdmin(phoneNumber: String, password: String, fullName: String, role: String) {
        viewModelScope.launch {
            runCatching { repository.createAdmin(phoneNumber, password, fullName, role) }
            load()
        }
    }

    fun toggleActive(admin: AdminAccount) {
        viewModelScope.launch {
            runCatching {
                repository.updateAdmin(admin.id, UpdateAdminRequest(isActive = !admin.isActive))
            }
            load()
        }
    }
}
