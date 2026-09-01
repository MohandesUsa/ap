package com.truckaccounting.admin.ui.trucks

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.TruckListItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface TrucksUiState {
    data object Loading : TrucksUiState
    data class Success(val trucks: List<TruckListItem>, val total: Int) : TrucksUiState
    data class Error(val message: String) : TrucksUiState
}

@HiltViewModel
class TrucksViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<TrucksUiState>(TrucksUiState.Loading)
    val state: StateFlow<TrucksUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = TrucksUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val response = repository.trucks()
                TrucksUiState.Success(response.trucks, response.pagination.total)
            } catch (e: Exception) {
                TrucksUiState.Error(e.message ?: "خطا در دریافت کامیون‌ها")
            }
        }
    }
}
