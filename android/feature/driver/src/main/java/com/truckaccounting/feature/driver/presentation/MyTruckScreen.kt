package com.truckaccounting.feature.driver.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.designsystem.component.AppCard
import com.truckaccounting.core.designsystem.component.StatusPill
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.driver.R

@Composable
fun MyTruckScreen(viewModel: MyTruckViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text(stringResource(R.string.my_truck_title)) }) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 18.dp)) {
            if (state.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                return@Scaffold
            }

            val truck = state.profile?.currentTruck
            AppCard {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
                    Box(
                        modifier = Modifier.size(64.dp).background(AppTheme.colors.driverTint, RoundedCornerShape(20.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Filled.LocalShipping, contentDescription = null, tint = AppTheme.colors.driverDark)
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = truck?.let { "${it.brand} — ${it.modelYear}" } ?: stringResource(R.string.my_truck_not_connected),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    if (truck == null) {
                        Text(
                            stringResource(R.string.my_truck_not_connected_desc),
                            style = MaterialTheme.typography.bodySmall,
                            color = AppTheme.colors.inkSoft,
                        )
                    }
                }
                Spacer(Modifier.height(6.dp))
                TruckInfoRow(stringResource(R.string.my_truck_brand), truck?.brand ?: "—")
                TruckInfoRow(stringResource(R.string.my_truck_model_year), truck?.modelYear ?: "—")
                TruckInfoRow(stringResource(R.string.my_truck_plate), truck?.plate ?: "—")
                TruckInfoRow(stringResource(R.string.my_truck_owner), truck?.ownerFullName ?: "—")
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(stringResource(R.string.my_truck_connection_status), color = AppTheme.colors.inkSoft, style = MaterialTheme.typography.bodyMedium)
                    if (truck != null) {
                        StatusPill("متصل و فعال", AppTheme.colors.successTint, AppTheme.colors.success)
                    } else {
                        StatusPill("متصل نیست", AppTheme.colors.pendingTint, AppTheme.colors.pending)
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppTheme.colors.driverTint, RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Icon(Icons.Filled.Info, contentDescription = null, tint = AppTheme.colors.driverDark, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Text(
                    stringResource(R.string.my_truck_readonly_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = AppTheme.colors.driverDark,
                )
            }
        }
    }
}

@Composable
private fun TruckInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = AppTheme.colors.inkSoft, style = MaterialTheme.typography.bodyMedium)
        Text(value, style = MaterialTheme.typography.labelLarge)
    }
}
