package com.truckaccounting.admin.ui.owners

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
fun OwnerDetailScreen(
    onBack: () -> Unit,
    viewModel: OwnerDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("جزئیات صاحب کامیون") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) } },
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is OwnerDetailUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is OwnerDetailUiState.Error -> Text(s.message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp))
                is OwnerDetailUiState.Success -> Column(modifier = Modifier.padding(24.dp)) {
                    val o = s.owner
                    Text(o.full_name, style = MaterialTheme.typography.headlineSmall)
                    o.company_name?.let { Text(it) }
                    Text(o.phone_number)
                    Text(if (o.is_active == 1) "وضعیت: فعال" else "وضعیت: غیرفعال")
                    Text("تعداد کامیون: ${o.trucks.size}")
                    Text("تعداد راننده متصل: ${o.drivers.size}")
                    Text("تعداد سفر: ${o.trips.size}")
                    Text("مجموع درآمد: ${o.totalIncome}")
                    Text("مجموع هزینه: ${o.totalExpense}")
                }
            }
        }
    }
}
