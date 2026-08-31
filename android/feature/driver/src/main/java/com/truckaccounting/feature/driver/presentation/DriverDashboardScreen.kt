package com.truckaccounting.feature.driver.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.truckaccounting.core.designsystem.component.AppCard
import com.truckaccounting.core.designsystem.component.MoneyRow
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.driver.R

@Composable
fun DriverDashboardScreen(onOpenInvitations: () -> Unit) {
    Scaffold(
        topBar = { TopAppBar(title = { Text(stringResource(R.string.driver_dashboard_title)) }) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 18.dp)) {
            Text(stringResource(R.string.greeting_driver), style = MaterialTheme.typography.bodyMedium, color = AppTheme.colors.inkSoft)
            Text(
                stringResource(R.string.driver_dashboard_summary),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(top = 2.dp, bottom = 16.dp),
            )

            // Phase 3 §23/§26: entry point to the real pending-invitations list. Always shown
            // (rather than conditionally fetching a count just for this banner) — a driver with
            // no pending invitations simply sees an empty state after tapping through.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppTheme.colors.driverTint, RoundedCornerShape(16.dp))
                    .clickable(onClick = onOpenInvitations)
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.MailOutline, contentDescription = null, tint = AppTheme.colors.driverDark)
                Spacer(Modifier.width(10.dp))
                Text("دعوت‌نامه‌های من", color = AppTheme.colors.driverDark, style = MaterialTheme.typography.labelLarge)
            }
            Spacer(Modifier.height(14.dp))

            AppCard {
                Text(stringResource(R.string.driver_stat_trip_count), style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.inkSoft)
                // Real trip count comes from the trip feature module once it ships — Phase 2
                // deliberately stops short of the accounting engine (project rule §31).
                Text("0 سرویس", style = MaterialTheme.typography.titleLarge)
            }
            Spacer(Modifier.height(14.dp))

            MoneyRow(label = stringResource(R.string.driver_stat_income), amount = "0 ریال", amountColor = AppTheme.colors.success)
            Spacer(Modifier.height(10.dp))
            MoneyRow(label = stringResource(R.string.driver_stat_expense), amount = "0 ریال", amountColor = AppTheme.colors.danger)
        }
    }
}
