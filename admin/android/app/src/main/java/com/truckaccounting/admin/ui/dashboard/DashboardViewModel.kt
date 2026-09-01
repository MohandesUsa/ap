package com.truckaccounting.admin.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.DashboardResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface DashboardUiState {
    data object Loading : DashboardUiState
    data class Success(val data: DashboardResponse) : DashboardUiState
    data class Error(val message: String) : DashboardUiState
}

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val state: StateFlow<DashboardUiState> = _state.asStateFlow()

    init { refresh() }

    /** Phase 27: no WebSocket/SSE yet — pull-to-refresh calling this again is the whole "real-time"
     *  story for now, exactly as the spec allows. */
    fun refresh() {
        _state.value = DashboardUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                DashboardUiState.Success(repository.dashboard())
            } catch (e: Exception) {
                DashboardUiState.Error(e.message ?: "خطا در دریافت اطلاعات داشبورد")
            }
        }
    }
}
