package com.truckaccounting.feature.auth.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.truckaccounting.core.designsystem.component.Role
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.auth.R

@Composable
internal fun AuthForm(
    role: Role,
    state: AuthUiState,
    registerTabLabel: String,
    registerSubtitle: String,
    loginSubtitle: String,
    nameFieldLabel: String,
    secondFieldLabel: String,
    onModeChange: (AuthMode) -> Unit,
    onPhoneChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onFullNameChange: (String) -> Unit,
    onSecondFieldChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    val tint = if (role == Role.OWNER) AppTheme.colors.owner else AppTheme.colors.driver

    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
        Text(
            text = if (state.mode == AuthMode.LOGIN) {
                androidx.compose.ui.res.stringResource(R.string.auth_login_title)
            } else {
                androidx.compose.ui.res.stringResource(R.string.auth_register_title)
            },
            style = MaterialTheme.typography.titleLarge,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            text = if (state.mode == AuthMode.LOGIN) loginSubtitle else registerSubtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = AppTheme.colors.inkSoft,
        )
        Spacer(Modifier.height(18.dp))

        // Tabs
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(100))
                .padding(4.dp),
        ) {
            AuthTab(
                text = androidx.compose.ui.res.stringResource(R.string.auth_tab_login),
                selected = state.mode == AuthMode.LOGIN,
                tint = tint,
                modifier = Modifier.weight(1f),
                onClick = { onModeChange(AuthMode.LOGIN) },
            )
            AuthTab(
                text = registerTabLabel,
                selected = state.mode == AuthMode.REGISTER,
                tint = tint,
                modifier = Modifier.weight(1f),
                onClick = { onModeChange(AuthMode.REGISTER) },
            )
        }
        Spacer(Modifier.height(18.dp))

        if (state.mode == AuthMode.REGISTER) {
            OutlinedTextField(
                value = state.fullName,
                onValueChange = onFullNameChange,
                label = { Text(nameFieldLabel) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = state.companyOrInviteCode,
                onValueChange = onSecondFieldChange,
                label = { Text(secondFieldLabel) },
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
        }

        OutlinedTextField(
            value = state.phoneNumber,
            onValueChange = onPhoneChange,
            label = { Text(androidx.compose.ui.res.stringResource(R.string.auth_field_phone)) },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            label = {
                Text(
                    androidx.compose.ui.res.stringResource(
                        if (state.mode == AuthMode.REGISTER) R.string.auth_field_password
                        else R.string.auth_field_password_or_otp,
                    ),
                )
            },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )

        state.errorMessage?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = AppTheme.colors.danger, style = MaterialTheme.typography.bodySmall)
        }

        Spacer(Modifier.height(18.dp))
        Button(
            onClick = onSubmit,
            enabled = !state.isSubmitting,
            shape = RoundedCornerShape(10.dp),
            colors = ButtonDefaults.buttonColors(containerColor = tint, contentColor = Color.White),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                androidx.compose.ui.res.stringResource(
                    if (state.mode == AuthMode.LOGIN) R.string.auth_cta_login else R.string.auth_cta_register,
                ),
            )
        }
        Spacer(Modifier.height(14.dp))
        Text(
            androidx.compose.ui.res.stringResource(R.string.auth_terms_notice),
            style = MaterialTheme.typography.bodySmall,
            color = AppTheme.colors.inkSoft,
        )
    }
}

@Composable
private fun AuthTab(text: String, selected: Boolean, tint: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    TextButton(
        onClick = onClick,
        modifier = modifier.background(if (selected) tint else Color.Transparent, RoundedCornerShape(100)),
    ) {
        Text(text, color = if (selected) Color.White else AppTheme.colors.inkSoft)
    }
}
