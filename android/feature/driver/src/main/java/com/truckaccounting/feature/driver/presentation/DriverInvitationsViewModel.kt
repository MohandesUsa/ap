package com.truckaccounting.feature.driver.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.core.network.DriverApi
import com.truckaccounting.core.network.InvitationSummary
import com.truckaccounting.core.network.toAppError
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DriverInvitationsUiState(
    val isLoading: Boolean = true,
    val invitations: List<InvitationSummary> = emptyList(),
    val acceptingId: String? = null,
    val errorMessage: String? = null,
    val acceptedTruckId: String? = null, // set once an accept succeeds — screen navigates away on this
)

@HiltViewModel
class DriverInvitationsViewModel @Inject constructor(
    private val driverApi: DriverApi,
) : ViewModel() {

    private val _state = MutableStateFlow(DriverInvitationsUiState())
    val state: StateFlow<DriverInvitationsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, errorMessage = null)
            runCatching { driverApi.listMyInvitations() }
                .onSuccess { response -> _state.value = _state.value.copy(isLoading = false, invitations = response.invitations) }
                .onFailure { err -> _state.value = _state.value.copy(isLoading = false, errorMessage = err.toAppError().message) }
        }
    }

    fun accept(invitationId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(acceptingId = invitationId, errorMessage = null)
            runCatching { driverApi.acceptInvitation(invitationId) }
                .onSuccess { response ->
                    _state.value = _state.value.copy(acceptingId = null, acceptedTruckId = response.driverTruckId ?: "")
                }
                .onFailure { err ->
                    _state.value = _state.value.copy(acceptingId = null, errorMessage = err.toAppError().message)
                }
        }
    }
}
