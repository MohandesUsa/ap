package com.truckaccounting.feature.owner.presentation.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.designsystem.component.AppCard
import com.truckaccounting.core.designsystem.component.MoneyRow
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.owner.R

@Composable
fun OwnerDashboardScreen(
    onOpenTrucks: () -> Unit,
    onOpenDrivers: () -> Unit,
    onOpenProfile: () -> Unit,
    viewModel: OwnerDashboardViewModel = hiltViewModel(),
) {
    val stats by viewModel.stats.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text(stringResource(R.string.dashboard_title)) })
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 18.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text(stringResource(R.string.greeting_owner), style = MaterialTheme.typography.bodyMedium, color = AppTheme.colors.inkSoft)
            Text(
                stringResource(R.string.dashboard_summary_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(top = 2.dp, bottom = 16.dp),
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DashboardStatCard(
                    label = stringResource(R.string.stat_my_trucks),
                    value = stats.truckCount.toString(),
                    modifier = Modifier.weight(1f),
                )
                DashboardStatCard(
                    label = stringResource(R.string.stat_active_drivers),
                    value = stats.driverCount.toString(),
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(14.dp))

            MoneyRow(
                label = stringResource(R.string.stat_income_month),
                amount = stats.formattedIncome,
                amountColor = AppTheme.colors.success,
            )
            Spacer(Modifier.height(10.dp))
            MoneyRow(
                label = stringResource(R.string.stat_expense_month),
                amount = stats.formattedExpense,
                amountColor = AppTheme.colors.danger,
            )
            Spacer(Modifier.height(10.dp))
            MoneyRow(
                label = stringResource(R.string.stat_net_income),
                amount = stats.formattedNet,
                amountColor = if (stats.netIsPositive) AppTheme.colors.success else AppTheme.colors.danger,
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun DashboardStatCard(label: String, value: String, modifier: Modifier = Modifier) {
    AppCard(modifier = modifier) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.inkSoft)
        Text(value, style = MaterialTheme.typography.titleLarge)
    }
}
