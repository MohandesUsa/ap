package com.truckaccounting.admin.ui.subscriptions

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.admin.data.PlanResponse
import com.truckaccounting.admin.data.SubscriptionRow
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun SubscriptionsScreen(
    openDrawer: () -> Unit,
    viewModel: SubscriptionsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var tab by remember { mutableIntStateOf(0) }
    var showCreatePlan by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("اشتراک‌ها و پلن‌ها") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
        floatingActionButton = {
            if (tab == 0) {
                FloatingActionButton(onClick = { showCreatePlan = true }) { Icon(Icons.Filled.Add, contentDescription = "پلن جدید") }
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("پلن‌ها") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("اشتراک‌های فعال") })
            }
            Box(modifier = Modifier.fillMaxSize()) {
                when (val s = state) {
                    is SubscriptionsUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    is SubscriptionsUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                        Text(s.message, color = MaterialTheme.colorScheme.error)
                        Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                    }
                    is SubscriptionsUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                        if (tab == 0) {
                            items(s.plans) { plan -> PlanRow(plan) }
                        } else {
                            items(s.subscriptions) { sub -> SubscriptionRowItem(sub) }
                        }
                    }
                }
            }
        }
    }

    if (showCreatePlan) {
        CreatePlanDialog(
            onDismiss = { showCreatePlan = false },
            onCreate = { name, days, price ->
                viewModel.createPlan(name, days, price)
                showCreatePlan = false
            },
        )
    }
}

@Composable
private fun PlanRow(plan: PlanResponse) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(plan.name, style = MaterialTheme.typography.bodyLarge)
            Text("مدت: ${plan.durationDays} روز — قیمت: ${plan.price}", style = MaterialTheme.typography.bodySmall)
            Text(if (plan.isActive) "فعال" else "غیرفعال", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun SubscriptionRowItem(sub: SubscriptionRow) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(sub.owner_name, style = MaterialTheme.typography.bodyLarge)
            Text("پلن: ${sub.plan_name} — وضعیت: ${sub.status}", style = MaterialTheme.typography.bodySmall)
            sub.expires_at?.let { Text("انقضا: $it", style = MaterialTheme.typography.bodySmall) }
        }
    }
}

@Composable
private fun CreatePlanDialog(onDismiss: () -> Unit, onCreate: (String, Int, Long) -> Unit) {
    var name by remember { mutableStateOf("") }
    var days by remember { mutableStateOf("30") }
    var price by remember { mutableStateOf("0") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("پلن جدید") },
        text = {
            Column {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("نام پلن") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = days, onValueChange = { days = it }, label = { Text("مدت (روز)") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                OutlinedTextField(value = price, onValueChange = { price = it }, label = { Text("قیمت (ریال)") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            }
        },
        confirmButton = {
            TextButton(onClick = { onCreate(name, days.toIntOrNull() ?: 30, price.toLongOrNull() ?: 0L) }) { Text("ایجاد") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
