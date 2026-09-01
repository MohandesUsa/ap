package com.truckaccounting.admin.ui.drivers

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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

@Composable
fun DriverDetailScreen(
    onBack: () -> Unit,
    viewModel: DriverDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("جزئیات راننده") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) } },
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is DriverDetailUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is DriverDetailUiState.Error -> Text(s.message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp))
                is DriverDetailUiState.Success -> Column(modifier = Modifier.padding(24.dp)) {
                    val d = s.driver
                    Text(d.full_name, style = MaterialTheme.typography.headlineSmall)
                    Text(d.phone_number)
                    Text(if (d.is_active == 1) "وضعیت: فعال" else "وضعیت: غیرفعال")
                    Text(if (d.pay_type == "percentage") "نوع پرداخت: درصدی (${d.pay_value}%)" else "نوع پرداخت: ثابت (${d.pay_value})")
                    Text("کامیون فعال: ${d.activeTruckId ?: "ندارد"}")
                    Text("تعداد سفر: ${d.trips.size}")
                    Text("مجموع درآمد: ${d.totalIncome}")
                    Text("مجموع هزینه: ${d.totalExpense}")
                }
            }
        }
    }
}
