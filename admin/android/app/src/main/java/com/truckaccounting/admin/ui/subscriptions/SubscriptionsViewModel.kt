package com.truckaccounting.admin.ui.subscriptions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.admin.data.AdminRepository
import com.truckaccounting.admin.data.PlanResponse
import com.truckaccounting.admin.data.SubscriptionRow
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface SubscriptionsUiState {
    data object Loading : SubscriptionsUiState
    data class Success(val plans: List<PlanResponse>, val subscriptions: List<SubscriptionRow>) : SubscriptionsUiState
    data class Error(val message: String) : SubscriptionsUiState
}

@HiltViewModel
class SubscriptionsViewModel @Inject constructor(
    private val repository: AdminRepository,
) : ViewModel() {
    private val _state = MutableStateFlow<SubscriptionsUiState>(SubscriptionsUiState.Loading)
    val state: StateFlow<SubscriptionsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = SubscriptionsUiState.Loading
        viewModelScope.launch {
            _state.value = try {
                val plans = repository.plans().plans
                val subscriptions = repository.subscriptions().subscriptions
                SubscriptionsUiState.Success(plans, subscriptions)
            } catch (e: Exception) {
                SubscriptionsUiState.Error(e.message ?: "خطا در دریافت اشتراک‌ها و پلن‌ها")
            }
        }
    }

    /** Phase 10: create-plan is the one write action this screen exposes; editing an existing
     *  plan follows the exact same repository.updatePlan() call, omitted here for brevity. */
    fun createPlan(name: String, durationDays: Int, price: Long) {
        viewModelScope.launch {
            runCatching { repository.createPlan(name, durationDays, price, null) }
            load()
        }
    }
}
