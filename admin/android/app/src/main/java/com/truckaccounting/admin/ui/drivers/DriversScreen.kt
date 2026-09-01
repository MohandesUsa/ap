package com.truckaccounting.admin.ui.drivers

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
import com.truckaccounting.admin.data.DriverListItem
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun DriversScreen(
    openDrawer: () -> Unit,
    onOpenDriver: (String) -> Unit,
    viewModel: DriversViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = { TopAppBar(title = { Text("رانندگان") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is DriversUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is DriversUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is DriversUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    item { Text("مجموع: ${s.total}", style = MaterialTheme.typography.bodySmall) }
                    items(s.drivers) { driver -> DriverRow(driver, onOpenDriver) }
                }
            }
        }
    }
}

@Composable
private fun DriverRow(driver: DriverListItem, onOpenDriver: (String) -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), onClick = { onOpenDriver(driver.id) }) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(driver.full_name, style = MaterialTheme.typography.bodyLarge)
            Text(driver.phone_number, style = MaterialTheme.typography.bodySmall)
            Text(
                if (driver.pay_type == "percentage") "درصدی: ${driver.pay_value}%" else "ثابت: ${driver.pay_value}",
                style = MaterialTheme.typography.bodySmall,
            )
            if (driver.truck_plate != null) {
                Text("کامیون: ${driver.truck_plate} — صاحب: ${driver.owner_name}", style = MaterialTheme.typography.bodySmall)
            } else {
                Text("به هیچ کامیونی متصل نیست", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
