package com.truckaccounting.admin.ui.trucks

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.TruckDetail
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface TruckDetailUiState {
    data object Loading : TruckDetailUiState
    data class Success(val truck: TruckDetail) : TruckDetailUiState
    data class Error(val message: String) : TruckDetailUiState
}

@HiltViewModel
class TruckDetailViewModel @Inject constructor(
    private val repository: AdminRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val truckId: String = checkNotNull(savedStateHandle["id"])
    private val _state = MutableStateFlow<TruckDetailUiState>(TruckDetailUiState.Loading)
    val state: StateFlow<TruckDetailUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = TruckDetailUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                TruckDetailUiState.Success(repository.truckDetail(truckId))
            } catch (e: Exception) {
                TruckDetailUiState.Error(e.message ?: "خطا در دریافت اطلاعات کامیون")
            }
        }
    }
}
