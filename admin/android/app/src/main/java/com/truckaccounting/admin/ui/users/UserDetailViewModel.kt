package com.truckaccounting.admin.ui.users

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.UserDetail
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface UserDetailUiState {
    data object Loading : UserDetailUiState
    data class Success(val user: UserDetail) : UserDetailUiState
    data class Error(val message: String) : UserDetailUiState
}

@HiltViewModel
class UserDetailViewModel @Inject constructor(
    private val repository: AdminRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val userId: String = checkNotNull(savedStateHandle["id"])
    private val _state = MutableStateFlow<UserDetailUiState>(UserDetailUiState.Loading)
    val state: StateFlow<UserDetailUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = UserDetailUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                UserDetailUiState.Success(repository.userDetail(userId))
            } catch (e: Exception) {
                UserDetailUiState.Error(e.message ?: "خطا در دریافت اطلاعات کاربر")
            }
        }
    }
}
