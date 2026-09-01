package com.truckaccounting.admin.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface LoginUiState {
    data object Idle : LoginUiState
    data object Loading : LoginUiState
    data object Success : LoginUiState
    data class Error(val message: String) : LoginUiState
}

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {

    private val _state = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun login(phoneNumber: String, password: String) {
        if (phoneNumber.isBlank() || password.isBlank()) {
            _state.value = LoginUiState.Error("شماره موبایل و رمز عبور را وارد کنید")
            return
        }
        _state.value = LoginUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                repository.login(phoneNumber, password)
                LoginUiState.Success
            } catch (e: Exception) {
                // A real Retrofit/HttpException mapping (401 -> "wrong credentials", network ->
                // "Network Error", ...) belongs in a shared ErrorMapping the same way
                // android/core/network/ErrorMapping.kt does for the User App — omitted here as
                // this screen's job is to prove the login round-trip works end-to-end, not to
                // duplicate that mapping unverified.
                LoginUiState.Error(e.message ?: "خطا در ورود")
            }
        }
    }
}
