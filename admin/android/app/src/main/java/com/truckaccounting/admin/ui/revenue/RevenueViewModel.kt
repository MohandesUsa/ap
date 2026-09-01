package com.truckaccounting.admin.ui.revenue

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.RevenueResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface RevenueUiState {
    data object Loading : RevenueUiState
    data class Success(val data: RevenueResponse) : RevenueUiState
    data class Error(val message: String) : RevenueUiState
}

@HiltViewModel
class RevenueViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<RevenueUiState>(RevenueUiState.Loading)
    val state: StateFlow<RevenueUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = RevenueUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                RevenueUiState.Success(repository.revenue())
            } catch (e: Exception) {
                RevenueUiState.Error(e.message ?: "خطا در دریافت اطلاعات درآمد")
            }
        }
    }
}
