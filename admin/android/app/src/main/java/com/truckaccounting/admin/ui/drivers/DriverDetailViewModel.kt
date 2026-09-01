package com.truckaccounting.admin.ui.drivers

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.DriverDetail
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface DriverDetailUiState {
    data object Loading : DriverDetailUiState
    data class Success(val driver: DriverDetail) : DriverDetailUiState
    data class Error(val message: String) : DriverDetailUiState
}

@HiltViewModel
class DriverDetailViewModel @Inject constructor(
    private val repository: AdminRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val driverId: String = checkNotNull(savedStateHandle["id"])
    private val _state = MutableStateFlow<DriverDetailUiState>(DriverDetailUiState.Loading)
    val state: StateFlow<DriverDetailUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = DriverDetailUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                DriverDetailUiState.Success(repository.driverDetail(driverId))
            } catch (e: Exception) {
                DriverDetailUiState.Error(e.message ?: "خطا در دریافت اطلاعات راننده")
            }
        }
    }
}
