package com.truckaccounting.feature.owner.presentation.driver

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.common.UiState
import com.truckaccounting.core.designsystem.component.StatusPill
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.owner.R
import com.truckaccounting.feature.owner.domain.Driver
import com.truckaccounting.feature.owner.domain.DriverPayType
import com.truckaccounting.feature.owner.domain.DriverStatus

@Composable
fun DriversListScreen(
    onAddDriver: () -> Unit,
    viewModel: DriversViewModel = hiltViewModel(),
) {
    val listState by viewModel.listState.collectAsState()

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = onAddDriver, containerColor = AppTheme.colors.owner) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.driver_add_title), tint = Color.White)
            }
        },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            when (val state = listState) {
                is UiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                is UiState.Empty -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.message, color = AppTheme.colors.inkFaint)
                }
                is UiState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.error.message, color = AppTheme.colors.danger)
                }
                is UiState.Refreshing -> Unit
                is UiState.Success -> LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(vertical = 12.dp),
                ) {
                    items(state.data, key = { it.id }) { driver -> DriverRow(driver) }
                }
            }
        }
    }
}

@Composable
private fun DriverRow(driver: Driver) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp))
            .padding(13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(44.dp).background(AppTheme.colors.ownerTint, RoundedCornerShape(13.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Person, contentDescription = null, tint = AppTheme.colors.ownerDark)
        }
        Column(modifier = Modifier.padding(start = 12.dp).weight(1f)) {
            Text(driver.name, style = MaterialTheme.typography.titleSmall)
            val payText = if (driver.payType == DriverPayType.PERCENT) {
                stringResource(R.string.driver_pay_percent_label, driver.payValue.toString())
            } else {
                stringResource(R.string.driver_pay_salary_label)
            }
            Text(payText, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.inkSoft)
        }
        val (pillText, pillBg, pillFg) = if (driver.status == DriverStatus.ACTIVE) {
            Triple("فعال", AppTheme.colors.successTint, AppTheme.colors.success)
        } else {
            Triple("در انتظار پذیرش", AppTheme.colors.pendingTint, AppTheme.colors.pending)
        }
        StatusPill(text = pillText, background = pillBg, contentColor = pillFg)
    }
}
