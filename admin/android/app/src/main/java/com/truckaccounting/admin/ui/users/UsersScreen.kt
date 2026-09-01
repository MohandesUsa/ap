package com.truckaccounting.admin.ui.users

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.admin.data.UserListItem
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun UsersScreen(
    openDrawer: () -> Unit,
    onOpenUser: (String) -> Unit,
    viewModel: UsersViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var query by remember { mutableStateOf("") }

    Scaffold(
        topBar = { TopAppBar(title = { Text("کاربران") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; viewModel.onSearchChange(it) },
                label = { Text("جستجو با نام یا شماره موبایل") },
                modifier = Modifier.fillMaxWidth().padding(16.dp),
            )
            Box(modifier = Modifier.fillMaxSize()) {
                when (val s = state) {
                    is UsersUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    is UsersUiState.Error -> Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(s.message, color = MaterialTheme.colorScheme.error)
                        Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                    }
                    is UsersUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                        item { Text("مجموع: ${s.total}", style = MaterialTheme.typography.bodySmall) }
                        items(s.users) { user -> UserRow(user, onOpenUser, viewModel) }
                    }
                }
            }
        }
    }
}

@Composable
private fun UserRow(user: UserListItem, onOpenUser: (String) -> Unit, viewModel: UsersViewModel) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        onClick = { onOpenUser(user.id) },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(user.full_name ?: "(بدون نام)", style = MaterialTheme.typography.bodyLarge)
                Text(user.phone_number, style = MaterialTheme.typography.bodySmall)
                Text(if (user.role == "owner") "صاحب کامیون" else "راننده", style = MaterialTheme.typography.bodySmall)
            }
            Switch(
                checked = user.is_active == 1,
                onCheckedChange = { viewModel.toggleActive(user.id, user.is_active == 1) },
            )
        }
    }
}
