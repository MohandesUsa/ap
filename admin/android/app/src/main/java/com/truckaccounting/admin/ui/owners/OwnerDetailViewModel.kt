package com.truckaccounting.admin.ui.owners

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.OwnerDetail
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface OwnerDetailUiState {
    data object Loading : OwnerDetailUiState
    data class Success(val owner: OwnerDetail) : OwnerDetailUiState
    data class Error(val message: String) : OwnerDetailUiState
}

@HiltViewModel
class OwnerDetailViewModel @Inject constructor(
    private val repository: AdminRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val ownerId: String = checkNotNull(savedStateHandle["id"])
    private val _state = MutableStateFlow<OwnerDetailUiState>(OwnerDetailUiState.Loading)
    val state: StateFlow<OwnerDetailUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = OwnerDetailUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                OwnerDetailUiState.Success(repository.ownerDetail(ownerId))
            } catch (e: Exception) {
                OwnerDetailUiState.Error(e.message ?: "خطا در دریافت اطلاعات صاحب کامیون")
            }
        }
    }
}
