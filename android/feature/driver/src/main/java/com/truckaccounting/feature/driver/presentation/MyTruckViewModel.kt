package com.truckaccounting.feature.driver.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.core.network.DriverApi
import com.truckaccounting.core.network.DriverProfileResponse
import com.truckaccounting.core.network.toAppError
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MyTruckUiState(
    val isLoading: Boolean = true,
    val profile: DriverProfileResponse? = null,
    val errorMessage: String? = null,
)

@HiltViewModel
class MyTruckViewModel @Inject constructor(
    private val driverApi: DriverApi,
) : ViewModel() {

    private val _state = MutableStateFlow(MyTruckUiState())
    val state: StateFlow<MyTruckUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { driverApi.myProfile() }
                .onSuccess { profile -> _state.value = MyTruckUiState(isLoading = false, profile = profile) }
                .onFailure { err -> _state.value = MyTruckUiState(isLoading = false, errorMessage = err.toAppError().message) }
        }
    }
}
