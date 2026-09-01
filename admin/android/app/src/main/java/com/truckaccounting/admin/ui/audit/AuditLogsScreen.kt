package com.truckaccounting.admin.ui.audit

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
import com.truckaccounting.admin.data.AuditLogRow
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun AuditLogsScreen(
    openDrawer: () -> Unit,
    viewModel: AuditLogsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = { TopAppBar(title = { Text("گزارش رویدادها") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is AuditLogsUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is AuditLogsUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is AuditLogsUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    items(s.logs) { log -> AuditLogRowItem(log) }
                }
            }
        }
    }
}

@Composable
private fun AuditLogRowItem(log: AuditLogRow) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(log.action, style = MaterialTheme.typography.bodyLarge)
            log.entity_type?.let { Text("موجودیت: $it ${log.entity_id ?: ""}", style = MaterialTheme.typography.bodySmall) }
            Text(log.created_at, style = MaterialTheme.typography.bodySmall)
        }
    }
}
