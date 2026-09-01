package com.truckaccounting.admin.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.truckaccounting.admin.ui.nav.DrawerMenuIcon

@Composable
fun SettingsScreen(
    openDrawer: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val actionMessage by viewModel.actionMessage.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var tab by remember { mutableIntStateOf(0) }

    LaunchedEffect(actionMessage) {
        actionMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearActionMessage()
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("تنظیمات") }, navigationIcon = { DrawerMenuIcon(openDrawer) }) },
        snackbarHost = { SnackbarHost(snackbarHostState) { Snackbar(it) } },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("پیامک") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("پرداخت") })
                Tab(selected = tab == 2, onClick = { tab = 2 }, text = { Text("سیستم") })
                Tab(selected = tab == 3, onClick = { tab = 3 }, text = { Text("قابلیت‌ها") })
            }
            Box(modifier = Modifier.fillMaxSize()) {
                when (val s = state) {
                    is SettingsUiState.Loading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                    is SettingsUiState.Error -> Column(modifier = Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
                        Text(s.message, color = MaterialTheme.colorScheme.error)
                        Button(onClick = { viewModel.load() }, modifier = Modifier.padding(top = 12.dp)) { Text("تلاش مجدد") }
                    }
                    is SettingsUiState.Success -> when (tab) {
                        0 -> SmsTab(s, viewModel)
                        1 -> PaymentTab(s, viewModel)
                        2 -> SystemTab(s, viewModel)
                        else -> FeatureFlagsTab(s, viewModel)
                    }
                }
            }
        }
    }
}

/** Settings responses mask secrets (e.g. `***4821`) — text fields are intentionally left blank
 *  rather than pre-filled with the mask, so re-saving with an empty field never overwrites a real
 *  secret with the mask string itself. The current masked value is shown as a placeholder only. */
@Composable
private fun SmsTab(s: SettingsUiState.Success, viewModel: SettingsViewModel) {
    var username by remember { mutableStateOf("") }
    var apiKey by remember { mutableStateOf("") }
    var sender by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("ارائه‌دهنده فعلی: ${s.sms.provider}", style = MaterialTheme.typography.bodyMedium)
        OutlinedTextField(
            value = username, onValueChange = { username = it },
            label = { Text("نام کاربری") }, placeholder = { Text(s.sms.username ?: "تنظیم نشده") },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
        OutlinedTextField(
            value = apiKey, onValueChange = { apiKey = it },
            label = { Text("API Key") }, placeholder = { Text(s.sms.apiKey ?: "تنظیم نشده") },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
        OutlinedTextField(
            value = sender, onValueChange = { sender = it },
            label = { Text("شماره فرستنده") }, placeholder = { Text(s.sms.sender ?: "تنظیم نشده") },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
        Row(modifier = Modifier.padding(top = 16.dp)) {
            Button(onClick = { viewModel.saveSms(apiKey, username, sender) }) { Text("ذخیره") }
            Button(onClick = { viewModel.testSms() }, modifier = Modifier.padding(start = 8.dp)) { Text("تست اتصال") }
        }
    }
}

@Composable
private fun PaymentTab(s: SettingsUiState.Success, viewModel: SettingsViewModel) {
    var merchantId by remember { mutableStateOf("") }
    var apiKey by remember { mutableStateOf("") }
    var sandbox by remember { mutableStateOf(s.payment.sandbox) }

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Text("درگاه فعلی: ${s.payment.provider}", style = MaterialTheme.typography.bodyMedium)
        OutlinedTextField(
            value = merchantId, onValueChange = { merchantId = it },
            label = { Text("Merchant ID") }, placeholder = { Text(s.payment.merchantId ?: "تنظیم نشده") },
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )
        OutlinedTextField(
            value = apiKey, onValueChange = { apiKey = it },
            label = { Text("API Key") }, placeholder = { Text(s.payment.apiKey ?: "تنظیم نشده") },
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 12.dp)) {
            Text("حالت آزمایشی (Sandbox)")
            Switch(checked = sandbox, onCheckedChange = { sandbox = it }, modifier = Modifier.padding(start = 8.dp))
        }
        Row(modifier = Modifier.padding(top = 16.dp)) {
            Button(onClick = { viewModel.savePayment(merchantId, apiKey, sandbox) }) { Text("ذخیره") }
            Button(onClick = { viewModel.testPayment() }, modifier = Modifier.padding(start = 8.dp)) { Text("تست اتصال") }
        }
    }
}

@Composable
private fun SystemTab(s: SettingsUiState.Success, viewModel: SettingsViewModel) {
    var appName by remember { mutableStateOf(s.system.app_name ?: "") }
    var supportPhone by remember { mutableStateOf(s.system.support_phone ?: "") }
    var supportEmail by remember { mutableStateOf(s.system.support_email ?: "") }
    var maintenanceMode by remember { mutableStateOf(s.system.maintenance_mode == "true") }

    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        OutlinedTextField(value = appName, onValueChange = { appName = it }, label = { Text("نام برنامه") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = supportPhone, onValueChange = { supportPhone = it }, label = { Text("شماره پشتیبانی") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        OutlinedTextField(value = supportEmail, onValueChange = { supportEmail = it }, label = { Text("ایمیل پشتیبانی") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 12.dp)) {
            Text("حالت تعمیر و نگهداری")
            Switch(checked = maintenanceMode, onCheckedChange = { maintenanceMode = it }, modifier = Modifier.padding(start = 8.dp))
        }
        Button(
            onClick = {
                viewModel.saveSystem(
                    mapOf(
                        "app_name" to appName, "support_phone" to supportPhone,
                        "support_email" to supportEmail, "maintenance_mode" to maintenanceMode.toString(),
                    ),
                )
            },
            modifier = Modifier.padding(top = 16.dp),
        ) { Text("ذخیره") }
    }
}

@Composable
private fun FeatureFlagsTab(s: SettingsUiState.Success, viewModel: SettingsViewModel) {
    Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp)) {
        s.featureFlags.forEach { (key, enabled) ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            ) {
                Text(key)
                Switch(checked = enabled, onCheckedChange = { viewModel.toggleFeatureFlag(key, it) })
            }
        }
    }
}
