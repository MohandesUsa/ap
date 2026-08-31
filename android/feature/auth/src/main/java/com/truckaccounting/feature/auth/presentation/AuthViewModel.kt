package com.truckaccounting.feature.auth.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.core.common.UiEvent
import com.truckaccounting.feature.auth.domain.AuthRepository
import com.truckaccounting.feature.auth.domain.AuthSession
import com.truckaccounting.feature.auth.domain.LoginParams
import com.truckaccounting.feature.auth.domain.RegisterParams
import com.truckaccounting.feature.auth.domain.UserRole
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AuthMode { LOGIN, REGISTER }

data class AuthUiState(
    // Matches the approved HTML prototype: new users land on Register by default and must
    // explicitly tap "ورود" to switch to the login form (see conversation history / prototype).
    val mode: AuthMode = AuthMode.REGISTER,
    val phoneNumber: String = "",
    val password: String = "",
    val fullName: String = "",
    val companyOrInviteCode: String = "",
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<UiEvent>()
    val events: SharedFlow<UiEvent> = _events

    fun onModeChange(mode: AuthMode) {
        _state.value = _state.value.copy(mode = mode, errorMessage = null)
    }

    fun onPhoneChange(value: String) { _state.value = _state.value.copy(phoneNumber = value) }
    fun onPasswordChange(value: String) { _state.value = _state.value.copy(password = value) }
    fun onFullNameChange(value: String) { _state.value = _state.value.copy(fullName = value) }
    fun onCompanyOrInviteChange(value: String) { _state.value = _state.value.copy(companyOrInviteCode = value) }

    fun submit(role: UserRole) {
        val current = _state.value
        viewModelScope.launch {
            _state.value = current.copy(isSubmitting = true, errorMessage = null)

            val result = if (current.mode == AuthMode.LOGIN) {
                authRepository.login(
                    LoginParams(
                        phoneNumber = current.phoneNumber,
                        password = current.password,
                        roleHint = role,
                    ),
                )
            } else {
                authRepository.register(
                    RegisterParams(
                        phoneNumber = current.phoneNumber,
                        password = current.password,
                        fullName = current.fullName,
                        roleHint = role,
                        companyName = if (role == UserRole.OWNER) current.companyOrInviteCode else null,
                        inviteCode = if (role == UserRole.DRIVER) current.companyOrInviteCode else null,
                    ),
                )
            }

            result
                .onSuccess { session -> handleSuccess(session) }
                .onFailure { error ->
                    _state.value = _state.value.copy(
                        isSubmitting = false,
                        errorMessage = error.message ?: "خطایی رخ داد",
                    )
                }
        }
    }

    private suspend fun handleSuccess(session: AuthSession) {
        _state.value = _state.value.copy(isSubmitting = false)
        _events.emit(UiEvent.ShowMessage("ورود موفق — خوش آمدید"))
        val destination = if (session.role == UserRole.OWNER) "owner_graph" else "driver_graph"
        _events.emit(UiEvent.Navigate(destination))
    }
}
