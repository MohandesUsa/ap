package com.truckaccounting.admin.ui.users

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.UserListItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface UsersUiState {
    data object Loading : UsersUiState
    data class Success(val users: List<UserListItem>, val total: Int) : UsersUiState
    data class Error(val message: String) : UsersUiState
}

@HiltViewModel
class UsersViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<UsersUiState>(UsersUiState.Loading)
    val state: StateFlow<UsersUiState> = _state.asStateFlow()

    private var search: String = ""

    init { load() }

    fun onSearchChange(value: String) {
        search = value
        load()
    }

    fun load() {
        _state.value = UsersUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val response = repository.users(search = search.ifBlank { null })
                UsersUiState.Success(response.users, response.pagination.total)
            } catch (e: Exception) {
                UsersUiState.Error(e.message ?: "خطا در دریافت کاربران")
            }
        }
    }

    fun toggleActive(userId: String, currentlyActive: Boolean) {
        viewModelScope.launch {
            runCatching { repository.setUserActive(userId, !currentlyActive) }
            load()
        }
    }
}
