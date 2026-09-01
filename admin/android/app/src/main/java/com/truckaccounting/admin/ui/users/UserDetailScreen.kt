package com.truckaccounting.admin.ui.users

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun UserDetailScreen(
    onBack: () -> Unit,
    viewModel: UserDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("جزئیات کاربر") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null) }
                },
            )
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is UserDetailUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is UserDetailUiState.Error -> Text(s.message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp))
                is UserDetailUiState.Success -> Column(modifier = Modifier.padding(24.dp)) {
                    val u = s.user
                    Text(u.full_name ?: "(بدون نام)", style = MaterialTheme.typography.headlineSmall)
                    Text(u.phone_number, style = MaterialTheme.typography.bodyMedium)
                    Text(if (u.role == "owner") "نقش: صاحب کامیون" else "نقش: راننده")
                    Text(if (u.is_active == 1) "وضعیت: فعال" else "وضعیت: غیرفعال")
                    u.company_name?.let { Text("شرکت: $it") }
                    if (u.role == "owner") {
                        Text("تعداد کامیون: ${u.trucks?.size ?: 0}")
                        Text("تعداد راننده متصل: ${u.drivers?.size ?: 0}")
                    }
                    Text("تعداد سفر: ${u.tripCount ?: 0}")
                    Text("تعداد هزینه: ${u.expenseCount ?: 0}")
                }
            }
        }
    }
}
