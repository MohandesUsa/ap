package com.truckaccounting.feature.driver.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.truckaccounting.core.designsystem.component.Role
import com.truckaccounting.core.designsystem.component.RoleButton
import com.truckaccounting.core.designsystem.theme.AppTheme

@Composable
fun DriverInvitationsScreen(
    onAccepted: () -> Unit,
    viewModel: DriverInvitationsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(state.acceptedTruckId) {
        if (state.acceptedTruckId != null) onAccepted()
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("دعوت‌نامه‌های من") }) },
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            when {
                state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.invitations.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("در حال حاضر دعوت‌نامه‌ای برای شما ثبت نشده است.", color = AppTheme.colors.inkFaint)
                }
                else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(vertical = 12.dp)) {
                    items(state.invitations, key = { it.id }) { invitation ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp))
                                .padding(16.dp),
                        ) {
                            Text("دعوت از یک صاحب کامیون", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "این دعوت تا ${invitation.expiresAt} معتبر است.",
                                style = MaterialTheme.typography.bodySmall,
                                color = AppTheme.colors.inkSoft,
                            )
                            Spacer(Modifier.height(10.dp))
                            RoleButton(
                                text = "پذیرفتن دعوت",
                                role = Role.DRIVER,
                                loading = state.acceptingId == invitation.id,
                                onClick = { viewModel.accept(invitation.id) },
                            )
                        }
                    }
                }
            }

            state.errorMessage?.let { message ->
                Text(message, color = AppTheme.colors.danger, modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp))
            }
        }
    }
}
