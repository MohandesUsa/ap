package com.truckaccounting.admin.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.admin.data.DashboardResponse

private data class StatItem(val label: String, val value: String)

private fun statsFrom(d: DashboardResponse): List<StatItem> = listOf(
    StatItem("کل کاربران", d.users.total.toString()),
    StatItem("کاربران فعال", d.users.active.toString()),
    StatItem("کاربر جدید امروز", d.users.newToday.toString()),
    StatItem("صاحبان کامیون", d.fleet.totalOwners.toString()),
    StatItem("رانندگان", d.fleet.totalDrivers.toString()),
    StatItem("کامیون‌ها", d.fleet.totalTrucks.toString()),
    StatItem("اشتراک فعال", d.subscriptions.active.toString()),
    StatItem("اشتراک منقضی", d.subscriptions.expired.toString()),
    StatItem("درآمد امروز", d.revenue.today.toString()),
    StatItem("درآمد این ماه", d.revenue.thisMonth.toString()),
    StatItem("پرداخت موفق", d.payments.successful.toString()),
    StatItem("پرداخت ناموفق", d.payments.failed.toString()),
)

@Composable
fun DashboardScreen(
    onLoggedOut: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("داشبورد مدیریت") })
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is DashboardUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is DashboardUiState.Error -> Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.refresh() }, modifier = Modifier.padding(top = 12.dp)) {
                        Text("تلاش مجدد")
                    }
                }
                is DashboardUiState.Success -> Column(modifier = Modifier.fillMaxSize()) {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(16.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        items(statsFrom(s.data)) { stat ->
                            Card(modifier = Modifier.padding(6.dp).fillMaxWidth()) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text(stat.label, style = MaterialTheme.typography.bodySmall)
                                    Text(stat.value, style = MaterialTheme.typography.headlineSmall)
                                }
                            }
                        }
                    }
                    Button(
                        onClick = { viewModel.logout(onLoggedOut) },
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                    ) { Text("خروج از حساب") }
                }
            }
        }
    }
}
