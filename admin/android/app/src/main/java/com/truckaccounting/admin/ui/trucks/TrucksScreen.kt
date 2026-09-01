package com.truckaccounting.admin.ui.trucks

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.truckaccounting.admin.data.TruckListItem
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun TrucksScreen(
    openDrawer: () -> Unit,
    onOpenTruck: (String) -> Unit,
    viewModel: TrucksViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = { TopAppBar(title = { Text("کامیون‌ها") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is TrucksUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is TrucksUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is TrucksUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    item { Text("مجموع: ${s.total}", style = MaterialTheme.typography.bodySmall) }
                    items(s.trucks) { truck -> TruckRow(truck, onOpenTruck) }
                }
            }
        }
    }
}

@Composable
private fun TruckRow(truck: TruckListItem, onOpenTruck: (String) -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), onClick = { onOpenTruck(truck.id) }) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(truck.plate, style = MaterialTheme.typography.bodyLarge)
            Text("${truck.brand} — ${truck.model_year}", style = MaterialTheme.typography.bodySmall)
            Text("صاحب: ${truck.owner_name}", style = MaterialTheme.typography.bodySmall)
            Text(if (truck.driver_name != null) "راننده: ${truck.driver_name}" else "بدون راننده", style = MaterialTheme.typography.bodySmall)
        }
    }
}
