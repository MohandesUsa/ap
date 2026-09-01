package com.truckaccounting.admin.ui.admins

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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import com.truckaccounting.admin.data.AdminAccount
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

private val ROLES = listOf("SUPER_ADMIN", "ADMIN", "SUPPORT", "ACCOUNTANT")

@Composable
fun AdminsScreen(
    openDrawer: () -> Unit,
    viewModel: AdminsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var showCreate by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("مدیریت ادمین‌ها") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreate = true }) { Icon(Icons.Filled.Add, contentDescription = "ادمین جدید") }
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is AdminsUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is AdminsUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is AdminsUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    items(s.admins) { admin -> AdminRowItem(admin, viewModel) }
                }
            }
        }
    }

    if (showCreate) {
        CreateAdminDialog(
            onDismiss = { showCreate = false },
            onCreate = { phone, password, fullName, role ->
                viewModel.createAdmin(phone, password, fullName, role)
                showCreate = false
            },
        )
    }
}

@Composable
private fun AdminRowItem(admin: AdminAccount, viewModel: AdminsViewModel) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text(admin.fullName, style = MaterialTheme.typography.bodyLarge)
                Text(admin.phoneNumber, style = MaterialTheme.typography.bodySmall)
                Text(admin.role, style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = admin.isActive, onCheckedChange = { viewModel.toggleActive(admin) })
        }
    }
}

@Composable
private fun CreateAdminDialog(onDismiss: () -> Unit, onCreate: (String, String, String, String) -> Unit) {
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var role by remember { mutableStateOf(ROLES[1]) }
    var roleMenuOpen by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("ادمین جدید") },
        text = {
            Column {
                OutlinedTextField(value = fullName, onValueChange = { fullName = it }, label = { Text("نام کامل") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("شماره موبایل") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("رمز عبور موقت") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                Box {
                    TextButton(onClick = { roleMenuOpen = true }) { Text("نقش: $role") }
                    DropdownMenu(expanded = roleMenuOpen, onDismissRequest = { roleMenuOpen = false }) {
                        ROLES.forEach { r -> DropdownMenuItem(text = { Text(r) }, onClick = { role = r; roleMenuOpen = false }) }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { onCreate(phone, password, fullName, role) }) { Text("ایجاد") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
