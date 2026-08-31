package com.truckaccounting.feature.auth.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.auth.R

@Composable
fun RoleSelectionScreen(
    onOwnerSelected: () -> Unit,
    onDriverSelected: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Column(
            modifier = Modifier.padding(bottom = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.role_select_title),
                style = MaterialTheme.typography.titleLarge,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = stringResource(R.string.role_select_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = AppTheme.colors.inkSoft,
            )
        }

        RoleCard(
            icon = Icons.Filled.LocalShipping,
            title = stringResource(R.string.role_owner_title),
            description = stringResource(R.string.role_owner_desc),
            tint = AppTheme.colors.owner,
            tintBg = AppTheme.colors.ownerTint,
            onClick = onOwnerSelected,
        )
        Spacer(Modifier.height(16.dp))
        RoleCard(
            icon = Icons.Filled.Person,
            title = stringResource(R.string.role_driver_title),
            description = stringResource(R.string.role_driver_desc),
            tint = AppTheme.colors.driver,
            tintBg = AppTheme.colors.driverTint,
            onClick = onDriverSelected,
        )
    }
}

@Composable
private fun RoleCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String,
    tint: androidx.compose.ui.graphics.Color,
    tintBg: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(22.dp))
            .clickable(onClick = onClick)
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(52.dp)
                .background(tintBg, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = tint)
        }
        Spacer(Modifier.size(14.dp))
        Column {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(description, style = MaterialTheme.typography.bodySmall, color = AppTheme.colors.inkSoft)
        }
    }
}
