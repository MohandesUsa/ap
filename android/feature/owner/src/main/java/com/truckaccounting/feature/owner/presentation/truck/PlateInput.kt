package com.truckaccounting.feature.owner.presentation.truck

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.owner.R
import com.truckaccounting.feature.owner.domain.PlateParts

private val PLATE_LETTERS = listOf(
    "الف", "ب", "پ", "ت", "ث", "ج", "د", "ز", "س", "ش", "ص", "ط",
    "ع", "ف", "ق", "ک", "گ", "ل", "م", "ن", "و", "ه", "ی",
)

/**
 * Reproduces the Iranian plate entry widget from the reference screenshot / approved HTML
 * prototype: [flag box] [2 digits] [letter ▾] [3 digits] ["ایران" + 2-digit province code].
 * Composes the 4 real inputs into a single [PlateParts] value; [onChange] fires on every edit so
 * the caller can derive [PlateParts.toPlateString] for validation/submission.
 */
@Composable
fun PlateInput(
    value: PlateParts,
    onChange: (PlateParts) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        FlagBadge(modifier = Modifier.weight(0.8f))

        PlateDigitsBox(
            value = value.firstDigits,
            maxLength = 2,
            onValueChange = { onChange(value.copy(firstDigits = it)) },
            modifier = Modifier.weight(1f),
        )

        LetterDropdownBox(
            selected = value.letter,
            onSelected = { onChange(value.copy(letter = it)) },
            modifier = Modifier.weight(1.1f),
        )

        PlateDigitsBox(
            value = value.secondDigits,
            maxLength = 3,
            onValueChange = { onChange(value.copy(secondDigits = it)) },
            modifier = Modifier.weight(1.2f),
        )

        ProvinceBox(
            value = value.provinceCode,
            onValueChange = { onChange(value.copy(provinceCode = it)) },
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun FlagBadge(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .aspectRatio(0.85f)
            .background(Color(0xFF2F6FED), RoundedCornerShape(10.dp)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        // Simple tricolor stripe, deliberately not a precise reproduction of the state emblem.
        Box(modifier = Modifier.width(22.dp).height(15.dp)) {
            Column {
                Box(Modifier.fillMaxWidth().height(5.dp).background(Color(0xFF279B48)))
                Box(Modifier.fillMaxWidth().height(5.dp).background(Color.White))
                Box(Modifier.fillMaxWidth().height(5.dp).background(Color(0xFFDA0000)))
            }
        }
        Text("IR", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold)
        Text("Iran", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.ExtraBold)
    }
}

@Composable
private fun PlateDigitsBox(
    value: String,
    maxLength: Int,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .background(MaterialTheme.colorScheme.background, RoundedCornerShape(10.dp))
            .border(1.5.dp, AppTheme.colors.border, RoundedCornerShape(10.dp)),
        contentAlignment = Alignment.Center,
    ) {
        BasicTextField(
            value = value,
            onValueChange = { new -> if (new.length <= maxLength && new.all(Char::isDigit)) onValueChange(new) },
            textStyle = TextStyle(
                textAlign = TextAlign.Center,
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
            ),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(4.dp),
        )
    }
}

@Composable
private fun LetterDropdownBox(
    selected: String,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(
        modifier = modifier
            .aspectRatio(1f)
            .background(MaterialTheme.colorScheme.background, RoundedCornerShape(10.dp))
            .border(1.5.dp, AppTheme.colors.border, RoundedCornerShape(10.dp))
            .clip(RoundedCornerShape(10.dp))
            .clickable { expanded = true },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            Icons.Filled.ArrowDropDown,
            contentDescription = null,
            tint = AppTheme.colors.inkFaint,
            modifier = Modifier.align(Alignment.CenterStart).padding(start = 2.dp),
        )
        Text(
            text = selected.ifBlank { "—" },
            fontSize = 15.sp,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            PLATE_LETTERS.forEach { letter ->
                DropdownMenuItem(text = { Text(letter) }, onClick = { onSelected(letter); expanded = false })
            }
        }
    }
}

@Composable
private fun ProvinceBox(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .aspectRatio(0.95f)
            .background(MaterialTheme.colorScheme.background, RoundedCornerShape(10.dp))
            .border(1.5.dp, AppTheme.colors.border, RoundedCornerShape(10.dp))
            .padding(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = androidx.compose.ui.res.stringResource(R.string.plate_country_label),
            fontSize = 9.5.sp,
            fontWeight = FontWeight.Bold,
            color = AppTheme.colors.inkSoft,
        )
        BasicTextField(
            value = value,
            onValueChange = { new -> if (new.length <= 2 && new.all(Char::isDigit)) onValueChange(new) },
            textStyle = TextStyle(
                textAlign = TextAlign.Center,
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
            ),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
