package com.truckaccounting.admin.ui.payments

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
import com.truckaccounting.admin.data.SubscriptionPaymentRow
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun PaymentsScreen(
    openDrawer: () -> Unit,
    viewModel: PaymentsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = { TopAppBar(title = { Text("پرداخت‌ها") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is PaymentsUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is PaymentsUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is PaymentsUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    item { Text("مجموع: ${s.total}", style = MaterialTheme.typography.bodySmall) }
                    items(s.payments) { payment -> PaymentRowItem(payment) }
                }
            }
        }
    }
}

@Composable
private fun PaymentRowItem(payment: SubscriptionPaymentRow) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text("${payment.owner_name} — ${payment.plan_name}", style = MaterialTheme.typography.bodyLarge)
            Text("مبلغ: ${payment.amount} — درگاه: ${payment.provider} — وضعیت: ${payment.status}", style = MaterialTheme.typography.bodySmall)
            payment.reference_id?.let { Text("کد پیگیری: $it", style = MaterialTheme.typography.bodySmall) }
        }
    }
}
