package com.truckaccounting.feature.owner.presentation.driver

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.designsystem.component.Role
import com.truckaccounting.core.designsystem.component.RoleButton
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.owner.R

@Composable
fun InviteDriverScreen(
    onDone: () -> Unit,
    viewModel: DriversViewModel = hiltViewModel(),
) {
    val phone by viewModel.invitePhone.collectAsState()
    val inviteCode by viewModel.inviteCode.collectAsState()

    Scaffold { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp)) {
            Text(
                stringResource(R.string.driver_add_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(vertical = 16.dp),
            )

            if (inviteCode == null) {
                OutlinedTextField(
                    value = phone,
                    onValueChange = viewModel::onPhoneChange,
                    label = { Text(stringResource(R.string.driver_field_phone)) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(18.dp))
                RoleButton(
                    text = stringResource(R.string.cta_send_invite),
                    role = Role.OWNER,
                    onClick = viewModel::sendInvite,
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(AppTheme.colors.ownerTint, RoundedCornerShape(16.dp))
                        .border(1.5.dp, AppTheme.colors.owner, RoundedCornerShape(16.dp))
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("کد دعوت راننده", style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.inkSoft)
                    Text(
                        inviteCode.orEmpty(),
                        style = MaterialTheme.typography.headlineSmall,
                        color = AppTheme.colors.ownerDark,
                        fontWeight = FontWeight.ExtraBold,
                        textDirection = TextDirection.Ltr,
                    )
                }
                Spacer(Modifier.height(14.dp))
                TextButton(onClick = { viewModel.finishInvite(); onDone() }) {
                    Text("باشه، متوجه شدم")
                }
            }
        }
    }
}
