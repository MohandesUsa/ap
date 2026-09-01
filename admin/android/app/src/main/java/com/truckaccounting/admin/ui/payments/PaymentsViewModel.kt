package com.truckaccounting.admin.ui.payments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.SubscriptionPaymentRow
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface PaymentsUiState {
    data object Loading : PaymentsUiState
    data class Success(val payments: List<SubscriptionPaymentRow>, val total: Int) : PaymentsUiState
    data class Error(val message: String) : PaymentsUiState
}

@HiltViewModel
class PaymentsViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<PaymentsUiState>(PaymentsUiState.Loading)
    val state: StateFlow<PaymentsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = PaymentsUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val response = repository.payments()
                PaymentsUiState.Success(response.payments, response.pagination.total)
            } catch (e: Exception) {
                PaymentsUiState.Error(e.message ?: "خطا در دریافت پرداخت‌ها")
            }
        }
    }
}
