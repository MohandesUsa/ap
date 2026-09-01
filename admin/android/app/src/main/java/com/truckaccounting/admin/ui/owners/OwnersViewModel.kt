package com.truckaccounting.admin.ui.owners

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.OwnerListItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface OwnersUiState {
    data object Loading : OwnersUiState
    data class Success(val owners: List<OwnerListItem>, val total: Int) : OwnersUiState
    data class Error(val message: String) : OwnersUiState
}

@HiltViewModel
class OwnersViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<OwnersUiState>(OwnersUiState.Loading)
    val state: StateFlow<OwnersUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = OwnersUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val response = repository.owners()
                OwnersUiState.Success(response.owners, response.pagination.total)
            } catch (e: Exception) {
                OwnersUiState.Error(e.message ?: "خطا در دریافت صاحبان کامیون")
            }
        }
    }
}
