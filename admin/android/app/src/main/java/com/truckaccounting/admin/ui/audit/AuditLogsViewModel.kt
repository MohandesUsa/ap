package com.truckaccounting.admin.ui.audit

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.AuditLogRow
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface AuditLogsUiState {
    data object Loading : AuditLogsUiState
    data class Success(val logs: List<AuditLogRow>) : AuditLogsUiState
    data class Error(val message: String) : AuditLogsUiState
}

/** Phase 20: read-only — this screen never edits or deletes anything, matching the backend's
 *  audit.routes.ts which exposes no write endpoint at all. */
@HiltViewModel
class AuditLogsViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<AuditLogsUiState>(AuditLogsUiState.Loading)
    val state: StateFlow<AuditLogsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = AuditLogsUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                AuditLogsUiState.Success(repository.auditLogs().logs)
            } catch (e: Exception) {
                AuditLogsUiState.Error(e.message ?: "خطا در دریافت گزارش رویدادها")
            }
        }
    }
}
