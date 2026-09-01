package com.truckaccounting.admin.ui.drivers

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.DriverListItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface DriversUiState {
    data object Loading : DriversUiState
    data class Success(val drivers: List<DriverListItem>, val total: Int) : DriversUiState
    data class Error(val message: String) : DriversUiState
}

@HiltViewModel
class DriversViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<DriversUiState>(DriversUiState.Loading)
    val state: StateFlow<DriversUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = DriversUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val response = repository.drivers()
                DriversUiState.Success(response.drivers, response.pagination.total)
            } catch (e: Exception) {
                DriversUiState.Error(e.message ?: "خطا در دریافت رانندگان")
            }
        }
    }
}
