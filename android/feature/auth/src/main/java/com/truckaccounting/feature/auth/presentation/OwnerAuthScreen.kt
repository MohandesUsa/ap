package com.truckaccounting.feature.auth.presentation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.common.UiEvent
import com.truckaccounting.core.designsystem.component.Role
import com.truckaccounting.feature.auth.R
import com.truckaccounting.feature.auth.domain.UserRole
import kotlinx.coroutines.flow.collectLatest

@Composable
fun OwnerAuthScreen(
    onNavigateBack: () -> Unit,
    onLoggedIn: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.events.collectLatest { event ->
            if (event is UiEvent.Navigate) onLoggedIn()
        }
    }

    Scaffold { padding ->
        Box(modifier = Modifier.fillMaxSize()) {
            AuthForm(
                role = Role.OWNER,
                state = state,
                registerTabLabel = stringResource(R.string.auth_tab_register_owner),
                registerSubtitle = stringResource(R.string.auth_owner_subtitle_register),
                loginSubtitle = stringResource(R.string.auth_owner_subtitle_login),
                nameFieldLabel = stringResource(R.string.auth_field_full_name),
                secondFieldLabel = stringResource(R.string.auth_field_company),
                onModeChange = viewModel::onModeChange,
                onPhoneChange = viewModel::onPhoneChange,
                onPasswordChange = viewModel::onPasswordChange,
                onFullNameChange = viewModel::onFullNameChange,
                onSecondFieldChange = viewModel::onCompanyOrInviteChange,
                onSubmit = { viewModel.submit(UserRole.OWNER) },
            )
        }
    }
}
