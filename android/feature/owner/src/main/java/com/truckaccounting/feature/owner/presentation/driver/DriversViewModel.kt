package com.truckaccounting.feature.owner.presentation.driver

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.core.common.UiEvent
import com.truckaccounting.core.common.UiState
import com.truckaccounting.feature.owner.domain.Driver
import com.truckaccounting.feature.owner.domain.DriverRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DriversViewModel @Inject constructor(
    private val driverRepository: DriverRepository,
) : ViewModel() {

    private val ownerId = "current-owner"

    private val _listState = MutableStateFlow<UiState<List<Driver>>>(UiState.Loading)
    val listState: StateFlow<UiState<List<Driver>>> = _listState.asStateFlow()

    private val _invitePhone = MutableStateFlow("")
    val invitePhone: StateFlow<String> = _invitePhone.asStateFlow()

    private val _inviteCode = MutableStateFlow<String?>(null)
    val inviteCode: StateFlow<String?> = _inviteCode.asStateFlow()

    private val _events = MutableSharedFlow<UiEvent>()
    val events: SharedFlow<UiEvent> = _events

    init {
        driverRepository.observeDrivers(ownerId)
            .map<List<Driver>, UiState<List<Driver>>> { drivers ->
                if (drivers.isEmpty()) UiState.Empty("هنوز راننده‌ای ثبت نشده است") else UiState.Success(drivers)
            }
            .catch { emit(UiState.Error(com.truckaccounting.core.common.AppError.Unknown(it.message))) }
            .onEach { _listState.value = it }
            .launchIn(viewModelScope)
    }

    fun onPhoneChange(value: String) { _invitePhone.value = value }

    fun sendInvite() {
        viewModelScope.launch {
            driverRepository.invite(ownerId, _invitePhone.value, truckId = null)
                .onSuccess { code -> _inviteCode.value = code }
                .onFailure { error -> _events.emit(UiEvent.ShowMessage(error.message ?: "خطا")) }
        }
    }

    fun finishInvite() {
        _inviteCode.value = null
        _invitePhone.value = ""
    }
}
