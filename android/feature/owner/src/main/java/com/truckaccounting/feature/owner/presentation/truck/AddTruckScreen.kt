package com.truckaccounting.feature.owner.presentation.truck

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.common.UiEvent
import com.truckaccounting.core.designsystem.component.Role
import com.truckaccounting.core.designsystem.component.RoleButton
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.owner.R
import kotlinx.coroutines.flow.collectLatest

@Composable
fun AddTruckScreen(
    onDone: () -> Unit,
    viewModel: TrucksViewModel = hiltViewModel(),
) {
    val form by viewModel.formState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.events.collectLatest { event -> if (event is UiEvent.NavigateBack) onDone() }
    }

    Scaffold { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp)) {
            Text(
                text = stringResource(if (form.editingTruckId != null) R.string.truck_edit_title else R.string.truck_add_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(vertical = 16.dp),
            )

            Text(
                stringResource(R.string.truck_field_plate),
                style = MaterialTheme.typography.labelLarge,
                color = AppTheme.colors.inkSoft,
                modifier = Modifier.padding(bottom = 6.dp),
            )
            PlateInput(value = form.plateParts, onChange = viewModel::onPlateChange)
            Spacer(Modifier.height(14.dp))

            OutlinedTextField(
                value = form.brand,
                onValueChange = viewModel::onBrandChange,
                label = { Text(stringResource(R.string.truck_field_brand)) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = form.modelYear,
                onValueChange = viewModel::onModelYearChange,
                label = { Text(stringResource(R.string.truck_field_model_year)) },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )

            form.errorMessage?.let {
                Spacer(Modifier.height(10.dp))
                Text(it, color = AppTheme.colors.danger, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(Modifier.height(20.dp))
            RoleButton(
                text = stringResource(R.string.cta_save_truck),
                role = Role.OWNER,
                loading = form.isSaving,
                onClick = viewModel::submit,
            )
        }
    }
}
