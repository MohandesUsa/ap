package com.truckaccounting.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection

private val LightColorScheme = lightColorScheme(
    primary = Owner,
    onPrimary = SurfaceLight,
    secondary = Driver,
    onSecondary = SurfaceLight,
    background = BgAppLight,
    onBackground = InkLight,
    surface = SurfaceLight,
    onSurface = InkLight,
    error = DangerColor,
    outline = BorderLight,
)

private val DarkColorScheme = darkColorScheme(
    primary = Owner,
    onPrimary = InkDark,
    secondary = Driver,
    onSecondary = InkDark,
    background = BgAppDark,
    onBackground = InkDark,
    surface = SurfaceDark,
    onSurface = InkDark,
    error = DangerColor,
    outline = BorderDark,
)

/**
 * App-wide theme. Forces RTL layout direction unconditionally because this app is Persian-only
 * (per Phase 1 decision) — it does not follow the system locale's direction, so the RTL prototype
 * layout is preserved even if the device's system language is set to an LTR language.
 */
@Composable
fun TruckAccountingTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val extendedColors = if (darkTheme) DarkExtendedColors else LightExtendedColors

    CompositionLocalProvider(
        LocalAppExtendedColors provides extendedColors,
        LocalLayoutDirection provides LayoutDirection.Rtl,
    ) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = AppTypography,
            content = content,
        )
    }
}

/** Shortcut accessor: `AppTheme.colors.owner` etc. instead of importing CompositionLocal by hand. */
object AppTheme {
    val colors: AppExtendedColors
        @Composable get() = LocalAppExtendedColors.current
}
