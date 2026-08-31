package com.truckaccounting.feature.owner.presentation.truck

import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.common.UiEvent
import com.truckaccounting.core.common.UiState
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.owner.R
import com.truckaccounting.feature.owner.domain.Truck
import kotlinx.coroutines.flow.collectLatest

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class, androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun TrucksListScreen(
    onAddTruck: () -> Unit,
    onEditTruck: () -> Unit,
    viewModel: TrucksViewModel = hiltViewModel(),
) {
    val listState by viewModel.listState.collectAsState()
    var actionSheetTruck by remember { mutableStateOf<Truck?>(null) }

    LaunchedEffect(Unit) {
        viewModel.events.collectLatest { /* snackbar host owned by the nav-level Scaffold in a full app */ }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.startAdd(); onAddTruck() }, containerColor = AppTheme.colors.owner) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.cta_add_truck), tint = androidx.compose.ui.graphics.Color.White)
            }
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            Text(
                stringResource(R.string.trucks_long_press_hint),
                style = MaterialTheme.typography.bodySmall,
                color = AppTheme.colors.inkFaint,
                modifier = Modifier.padding(vertical = 10.dp),
            )

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
                    contentPadding = PaddingValues(vertical = 8.dp),
                ) {
                    items(state.data, key = { it.id }) { truck ->
                        TruckRow(
                            truck = truck,
                            onLongPress = { actionSheetTruck = truck },
                        )
                    }
                }
            }
        }
    }

    actionSheetTruck?.let { truck ->
        ModalBottomSheet(onDismissRequest = { actionSheetTruck = null }) {
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                TextButton(onClick = {
                    viewModel.startEdit(truck)
                    actionSheetTruck = null
                    onEditTruck()
                }) { Text(stringResource(R.string.truck_action_edit)) }
                TextButton(onClick = {
                    viewModel.delete(truck.id)
                    actionSheetTruck = null
                }) { Text(stringResource(R.string.truck_action_delete), color = AppTheme.colors.danger) }
                TextButton(onClick = { actionSheetTruck = null }) {
                    Text(stringResource(R.string.truck_action_cancel), color = AppTheme.colors.inkSoft)
                }
            }
        }
    }
}

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
private fun TruckRow(truck: Truck, onLongPress: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp))
            .combinedClickable(onClick = {}, onLongClick = onLongPress)
            .padding(13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(44.dp).background(AppTheme.colors.ownerTint, RoundedCornerShape(13.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.LocalShipping, contentDescription = null, tint = AppTheme.colors.ownerDark)
        }
        Column(modifier = Modifier.padding(start = 12.dp)) {
            Text("${truck.brand} — ${truck.modelYear}", style = MaterialTheme.typography.titleSmall)
            Text("پلاک: ${truck.plate}", style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.inkSoft)
        }
    }
}
