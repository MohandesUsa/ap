package com.truckaccounting.feature.owner.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.feature.owner.domain.DriverRepository
import com.truckaccounting.feature.owner.domain.TruckRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import java.text.NumberFormat
import java.util.Locale
import javax.inject.Inject

data class OwnerDashboardStats(
    val truckCount: Int = 0,
    val driverCount: Int = 0,
    val formattedIncome: String = "0 ریال",
    val formattedExpense: String = "0 ریال",
    val formattedNet: String = "0 ریال",
    val netIsPositive: Boolean = true,
)

@HiltViewModel
class OwnerDashboardViewModel @Inject constructor(
    truckRepository: TruckRepository,
    driverRepository: DriverRepository,
) : ViewModel() {

    private val ownerId = "current-owner" // see TrucksViewModel TODO — same placeholder until real auth

    private val _stats = MutableStateFlow(OwnerDashboardStats())
    val stats: StateFlow<OwnerDashboardStats> = _stats.asStateFlow()

    init {
        combine(
            truckRepository.observeTrucks(ownerId),
            driverRepository.observeDrivers(ownerId),
        ) { trucks, drivers ->
            // Income/expense accounting is explicitly out of scope for Phase 2 (project rule §31,
            // "Accounting Engine" ships in a later phase) — these are placeholder zeros wired
            // through the real formatting helper so the UI layout/format is already correct and
            // only the data source needs to change later.
            val income = 0L
            val expense = 0L
            val net = income - expense
            OwnerDashboardStats(
                truckCount = trucks.size,
                driverCount = drivers.size,
                formattedIncome = formatRial(income),
                formattedExpense = formatRial(expense),
                formattedNet = formatRial(net),
                netIsPositive = net >= 0,
            )
        }.onEach { _stats.value = it }.launchIn(viewModelScope)
    }

    private fun formatRial(amountToman: Long): String {
        val rial = amountToman * 10
        return "${NumberFormat.getNumberInstance(Locale.US).format(rial)} ریال"
    }
}
