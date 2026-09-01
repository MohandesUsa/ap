package com.truckaccounting.admin.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.PaymentSettingsResponse
import com.truckaccounting.admin.data.PaymentSettingsUpdateRequest
import com.truckaccounting.admin.data.SmsSettingsResponse
import com.truckaccounting.admin.data.SmsSettingsUpdateRequest
import com.truckaccounting.admin.data.SystemSettingsResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface SettingsUiState {
    data object Loading : SettingsUiState
    data class Success(
        val sms: SmsSettingsResponse,
        val payment: PaymentSettingsResponse,
        val system: SystemSettingsResponse,
        val featureFlags: Map<String, Boolean>,
    ) : SettingsUiState
    data class Error(val message: String) : SettingsUiState
}

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<SettingsUiState>(SettingsUiState.Loading)
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    init { load() }

    fun load() {
        _state.value = SettingsUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                SettingsUiState.Success(
                    sms = repository.smsSettings(),
                    payment = repository.paymentSettings(),
                    system = repository.systemSettings(),
                    featureFlags = repository.featureFlags(),
                )
            } catch (e: Exception) {
                SettingsUiState.Error(e.message ?: "خطا در دریافت تنظیمات")
            }
        }
    }

    fun clearActionMessage() { _actionMessage.value = null }

    fun saveSms(apiKey: String, username: String, sender: String) {
        viewModelScope.launch {
            runCatching {
                repository.updateSmsSettings(SmsSettingsUpdateRequest(username = username, apiKey = apiKey, sender = sender))
            }
            load()
        }
    }

    fun testSms() {
        viewModelScope.launch {
            val result = runCatching { repository.testSmsConnection() }.getOrNull()
            _actionMessage.value = result?.detail ?: "خطا در تست اتصال ملی‌پیامک"
        }
    }

    fun savePayment(merchantId: String, apiKey: String, sandbox: Boolean) {
        viewModelScope.launch {
            runCatching {
                repository.updatePaymentSettings(PaymentSettingsUpdateRequest(merchantId = merchantId, apiKey = apiKey, sandbox = sandbox))
            }
            load()
        }
    }

    fun testPayment() {
        viewModelScope.launch {
            val result = runCatching { repository.testPaymentConnection() }.getOrNull()
            _actionMessage.value = result?.detail ?: "خطا در تست اتصال زرین‌پال"
        }
    }

    fun saveSystem(values: Map<String, String>) {
        viewModelScope.launch {
            runCatching { repository.updateSystemSettings(values) }
            load()
        }
    }

    fun toggleFeatureFlag(key: String, enabled: Boolean) {
        viewModelScope.launch {
            runCatching { repository.updateFeatureFlag(key, enabled) }
            load()
        }
    }
}
