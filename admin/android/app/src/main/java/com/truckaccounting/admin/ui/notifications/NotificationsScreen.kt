package com.truckaccounting.admin.ui.notifications

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
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import com.truckaccounting.admin.data.NotificationRow
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

private val TARGETS = listOf("all", "owners", "drivers", "active_subscribers", "expired_subscribers")
private fun targetLabel(t: String) = when (t) {
    "all" -> "همه کاربران"
    "owners" -> "صاحبان کامیون"
    "drivers" -> "رانندگان"
    "active_subscribers" -> "مشترکین فعال"
    "expired_subscribers" -> "مشترکین منقضی"
    else -> t
}

@Composable
fun NotificationsScreen(
    openDrawer: () -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var showCreate by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("اعلان‌ها") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreate = true }) { Icon(Icons.Filled.Add, contentDescription = "اعلان جدید") }
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            when (val s = state) {
                is NotificationsUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                is NotificationsUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                }
                is NotificationsUiState.Success -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    items(s.notifications) { n -> NotificationRowItem(n) }
                }
            }
        }
    }

    if (showCreate) {
        CreateNotificationDialog(
            onDismiss = { showCreate = false },
            onCreate = { title, message, target ->
                viewModel.create(title, message, target)
                showCreate = false
            },
        )
    }
}

@Composable
private fun NotificationRowItem(n: NotificationRow) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(n.title, style = MaterialTheme.typography.bodyLarge)
            Text(n.message, style = MaterialTheme.typography.bodyMedium)
            Text("مخاطب: ${targetLabel(n.target)} — ${n.created_at}", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun CreateNotificationDialog(onDismiss: () -> Unit, onCreate: (String, String, String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var target by remember { mutableStateOf(TARGETS[0]) }
    var targetMenuOpen by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("اعلان جدید") },
        text = {
            Column {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("عنوان") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("متن پیام") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
                Box {
                    TextButton(onClick = { targetMenuOpen = true }) { Text("مخاطب: ${targetLabel(target)}") }
                    DropdownMenu(expanded = targetMenuOpen, onDismissRequest = { targetMenuOpen = false }) {
                        TARGETS.forEach { t ->
                            DropdownMenuItem(text = { Text(targetLabel(t)) }, onClick = { target = t; targetMenuOpen = false })
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { onCreate(title, message, target) }) { Text("ارسال") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
