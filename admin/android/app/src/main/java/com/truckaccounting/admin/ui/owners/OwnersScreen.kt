package com.truckaccounting.admin.ui.owners

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
import com.truckaccounting.admin.data.OwnerListItem
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun OwnersScreen(
    openDrawer: () -> Unit,
    onOpenOwner: (String) -> Unit,
    viewModel: OwnersViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = { TopAppBar(title = { Text("صاحبان کامیون") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is OwnersUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is OwnersUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is OwnersUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    item { Text("مجموع: ${s.total}", style = MaterialTheme.typography.bodySmall) }
                    items(s.owners) { owner -> OwnerRow(owner, onOpenOwner) }
                }
            }
        }
    }
}

@Composable
private fun OwnerRow(owner: OwnerListItem, onOpenOwner: (String) -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), onClick = { onOpenOwner(owner.id) }) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(owner.full_name, style = MaterialTheme.typography.bodyLarge)
            owner.company_name?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            Text(owner.phone_number, style = MaterialTheme.typography.bodySmall)
            Text("کامیون فعال: ${owner.truck_count} — راننده متصل: ${owner.driver_count}", style = MaterialTheme.typography.bodySmall)
            Text("اشتراک: ${owner.subscription_status ?: "بدون اشتراک"}", style = MaterialTheme.typography.bodySmall)
        }
    }
}
