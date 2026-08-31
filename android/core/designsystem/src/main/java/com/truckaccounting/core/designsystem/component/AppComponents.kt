package com.truckaccounting.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import com.truckaccounting.core.designsystem.theme.AppTheme

enum class Role { OWNER, DRIVER }

/** Matches the prototype's `.btn.owner-btn` / `.btn.driver-btn` — role-tinted primary CTA. */
@Composable
fun RoleButton(
    text: String,
    role: Role,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit,
) {
    val tint = if (role == Role.OWNER) AppTheme.colors.owner else AppTheme.colors.driver
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = tint, contentColor = Color.White),
        modifier = modifier.fillMaxWidth(),
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.padding(end = 8.dp).then(Modifier), color = Color.White)
        }
        Text(text)
    }
}

/** Matches the prototype's `.card` — surface + border + rounded corners. */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, AppTheme.colors.border),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        androidx.compose.foundation.layout.Column(modifier = Modifier.padding(16.dp)) { content() }
    }
}

/**
 * Matches the prototype's `.money-row` (label right, amount left, larger box, one per row) —
 * exact layout requested for the owner dashboard's income/expense/net rows.
 */
@Composable
fun MoneyRow(
    label: String,
    amount: String,
    amountColor: Color,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp))
            .border(1.dp, AppTheme.colors.border, RoundedCornerShape(16.dp))
            .padding(horizontal = 18.dp, vertical = 20.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = AppTheme.colors.inkSoft,
        )
        Text(
            text = amount,
            style = MaterialTheme.typography.titleLarge,
            color = amountColor,
            textDirection = TextDirection.Ltr,
        )
    }
}

/** Status pill matching `.status-pill.active/.pending/.settled`. */
@Composable
fun StatusPill(text: String, background: Color, contentColor: Color, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .background(background, RoundedCornerShape(100))
            .padding(horizontal = 9.dp, vertical = 3.dp),
    ) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = contentColor)
    }
}
