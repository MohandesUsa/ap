package com.truckaccounting.admin.ui.revenue

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
import com.truckaccounting.admin.data.RevenueResponse
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

private data class StatItem(val label: String, val value: String)

private fun statsFrom(d: RevenueResponse): List<StatItem> = listOf(
    StatItem("درآمد امروز", d.today.toString()),
    StatItem("درآمد این ماه", d.thisMonth.toString()),
    StatItem("درآمد امسال", d.thisYear.toString()),
    StatItem("مجموع کل", d.allTime.toString()),
    StatItem("پرداخت موفق", (d.paymentCounts["successful"] ?: 0).toString()),
    StatItem("پرداخت ناموفق", (d.paymentCounts["failed"] ?: 0).toString()),
    StatItem("پرداخت در انتظار", (d.paymentCounts["pending"] ?: 0).toString()),
)

@Composable
fun RevenueScreen(
    openDrawer: () -> Unit,
    viewModel: RevenueViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = { TopAppBar(title = { Text("درآمد") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is RevenueUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is RevenueUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is RevenueUiState.Success -> LazyVerticalGrid(columns = GridCells.Fixed(2), contentPadding = PaddingValues(16.dp)) {
                    items(statsFrom(s.data)) { stat ->
                        Card(modifier = Modifier.padding(6.dp).fillMaxWidth()) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text(stat.label, style = MaterialTheme.typography.bodySmall)
                                Text(stat.value, style = MaterialTheme.typography.headlineSmall)
                            }
                        }
                    }
                }
            }
        }
    }
}
