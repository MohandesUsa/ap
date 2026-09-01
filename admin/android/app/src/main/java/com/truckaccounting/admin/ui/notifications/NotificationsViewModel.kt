package com.truckaccounting.admin.ui.notifications

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.NotificationRow
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface NotificationsUiState {
    data object Loading : NotificationsUiState
    data class Success(val notifications: List<NotificationRow>) : NotificationsUiState
    data class Error(val message: String) : NotificationsUiState
}

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<NotificationsUiState>(NotificationsUiState.Loading)
    val state: StateFlow<NotificationsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = NotificationsUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                NotificationsUiState.Success(repository.notifications().notifications)
            } catch (e: Exception) {
                NotificationsUiState.Error(e.message ?: "خطا در دریافت اعلان‌ها")
            }
        }
    }

    fun create(title: String, message: String, target: String) {
        viewModelScope.launch {
            runCatching { repository.createNotification(title, message, target, null) }
            load()
        }
    }
}
