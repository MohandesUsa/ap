package com.truckaccounting.core.designsystem.theme

import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Material3's ColorScheme doesn't have slots for our two role accents (owner/driver) or the
 * soft/faint ink variants used throughout the prototype, so we carry them via a small
 * CompositionLocal instead of overloading ColorScheme with off-label meanings.
 */
data class AppExtendedColors(
    val inkSoft: Color,
    val inkFaint: Color,
    val border: Color,
    val borderStrong: Color,
    val owner: Color,
    val ownerDark: Color,
    val ownerTint: Color,
    val driver: Color,
    val driverDark: Color,
    val driverTint: Color,
    val success: Color,
    val successTint: Color,
    val danger: Color,
    val dangerTint: Color,
    val pending: Color,
    val pendingTint: Color,
)

val LightExtendedColors = AppExtendedColors(
    inkSoft = InkSoftLight,
    inkFaint = InkFaintLight,
    border = BorderLight,
    borderStrong = BorderStrongLight,
    owner = Owner, ownerDark = OwnerDark, ownerTint = OwnerTint,
    driver = Driver, driverDark = DriverDark, driverTint = DriverTint,
    success = Success, successTint = SuccessTint,
    danger = DangerColor, dangerTint = DangerTint,
    pending = PendingColor, pendingTint = PendingTint,
)

val DarkExtendedColors = AppExtendedColors(
    inkSoft = InkSoftDark,
    inkFaint = InkFaintDark,
    border = BorderDark,
    borderStrong = BorderStrongDark,
    owner = Owner, ownerDark = OwnerDark, ownerTint = OwnerTint,
    driver = Driver, driverDark = DriverDark, driverTint = DriverTint,
    success = Success, successTint = SuccessTint,
    danger = DangerColor, dangerTint = DangerTint,
    pending = PendingColor, pendingTint = PendingTint,
)

val LocalAppExtendedColors = staticCompositionLocalOf { LightExtendedColors }
