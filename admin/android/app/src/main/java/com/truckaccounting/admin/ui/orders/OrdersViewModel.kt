package com.truckaccounting.admin.ui.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.OrderRow
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface OrdersUiState {
    data object Loading : OrdersUiState
    data class Success(val orders: List<OrderRow>, val total: Int) : OrdersUiState
    data class Error(val message: String) : OrdersUiState
}

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<OrdersUiState>(OrdersUiState.Loading)
    val state: StateFlow<OrdersUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = OrdersUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val response = repository.orders()
                OrdersUiState.Success(response.orders, response.pagination.total)
            } catch (e: Exception) {
                OrdersUiState.Error(e.message ?: "خطا در دریافت سفارش‌ها")
            }
        }
    }
}
