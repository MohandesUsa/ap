package com.truckaccounting.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * NOTE: the HTML prototype uses the "Vazirmatn" variable font (loaded from Google Fonts) for
 * all Persian text. To match it exactly, drop the Vazirmatn .ttf files into
 * core/designsystem/src/main/res/font/ and replace `AppFontFamily` below with:
 *
 *   val AppFontFamily = FontFamily(
 *       Font(R.font.vazirmatn_regular, FontWeight.Normal),
 *       Font(R.font.vazirmatn_medium, FontWeight.Medium),
 *       Font(R.font.vazirmatn_bold, FontWeight.Bold),
 *       Font(R.font.vazirmatn_extrabold, FontWeight.ExtraBold),
 *   )
 *
 * Until then we fall back to the platform default, which still renders Persian correctly.
 */
val AppFontFamily = FontFamily.Default

val AppTypography = Typography(
    headlineSmall = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.ExtraBold, fontSize = 21.sp),
    titleLarge = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.Bold, fontSize = 19.sp),
    titleMedium = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.Bold, fontSize = 17.sp),
    titleSmall = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.Bold, fontSize = 14.5.sp),
    bodyLarge = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.Normal, fontSize = 14.5.sp),
    bodyMedium = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.Normal, fontSize = 13.sp),
    bodySmall = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.Normal, fontSize = 12.sp),
    labelLarge = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp),
    labelMedium = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.SemiBold, fontSize = 12.sp),
    labelSmall = TextStyle(fontFamily = AppFontFamily, fontWeight = FontWeight.Medium, fontSize = 10.5.sp),
)
