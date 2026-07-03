package com.almostblue.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Tokens de couleur — port 1:1 de spec/src/theme/colors.ts (v1.3).
 * Palette « dark crépusculaire » (référence : Chet Baker, "Almost Blue").
 */
@Immutable
data class AppColors(
    val background: Color,
    val surface: Color,
    val surfaceHigh: Color,
    val border: Color,
    val accent: Color,
    val accentDim: Color,
    val textPrimary: Color,
    val textMuted: Color,
    val textDisabled: Color,
    val good: Color,
    val warning: Color,
    val danger: Color,
    val white: Color = Color(0xFFFFFFFF),
    val black: Color = Color(0xFF000000),
)

val DarkColors = AppColors(
    background   = Color(0xFF0D0F14),
    surface      = Color(0xFF161B26),
    surfaceHigh  = Color(0xFF1E2535),
    border       = Color(0xFF2A3347),
    accent       = Color(0xFF4D7EFF),
    accentDim    = Color(0xFF1E3080),
    textPrimary  = Color(0xFFE8EAF0),
    textMuted    = Color(0xFF7B85A0),
    textDisabled = Color(0xFF3D4A63),
    good         = Color(0xFF5EEAD4),
    warning      = Color(0xFFF59E0B),
    danger       = Color(0xFFEF4444),
)

val LightColors = AppColors(
    background   = Color(0xFFF4F5F8),
    surface      = Color(0xFFFFFFFF),
    surfaceHigh  = Color(0xFFECEEF3),
    border       = Color(0xFFCDD2DF),
    accent       = Color(0xFF4D7EFF),
    accentDim    = Color(0xFFC5D2FF),
    textPrimary  = Color(0xFF1A1F2E),
    textMuted    = Color(0xFF56607A),
    textDisabled = Color(0xFF9BA5BC),
    // Versions légèrement plus sombres pour garder le contraste sur fond clair
    good         = Color(0xFF0D9488),
    warning      = Color(0xFFD97706),
    danger       = Color(0xFFDC2626),
)
