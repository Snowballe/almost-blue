package com.almostblue.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

/**
 * Distribution du thème — équivalent de ThemeContext.tsx : les écrans lisent
 * les tokens via [AppTheme.colors] plutôt que le colorScheme Material.
 * Le colorScheme Material n'est mappé que pour les composants M3 (Switch, etc.).
 */
val LocalAppColors = staticCompositionLocalOf { DarkColors }

object AppTheme {
    val colors: AppColors
        @Composable @ReadOnlyComposable get() = LocalAppColors.current
}

@Composable
fun AlmostBlueTheme(
    dark: Boolean = true,
    content: @Composable () -> Unit,
) {
    val appColors = if (dark) DarkColors else LightColors
    val colorScheme = if (dark) {
        darkColorScheme(
            primary = appColors.accent,
            background = appColors.background,
            surface = appColors.surface,
            surfaceVariant = appColors.surfaceHigh,
            outline = appColors.border,
            onPrimary = appColors.white,
            onBackground = appColors.textPrimary,
            onSurface = appColors.textPrimary,
            onSurfaceVariant = appColors.textMuted,
            error = appColors.danger,
        )
    } else {
        lightColorScheme(
            primary = appColors.accent,
            background = appColors.background,
            surface = appColors.surface,
            surfaceVariant = appColors.surfaceHigh,
            outline = appColors.border,
            onPrimary = appColors.white,
            onBackground = appColors.textPrimary,
            onSurface = appColors.textPrimary,
            onSurfaceVariant = appColors.textMuted,
            error = appColors.danger,
        )
    }

    CompositionLocalProvider(LocalAppColors provides appColors) {
        MaterialTheme(colorScheme = colorScheme, content = content)
    }
}
