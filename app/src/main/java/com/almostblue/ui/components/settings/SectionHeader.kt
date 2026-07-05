package com.almostblue.ui.components.settings

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing

/** Tête de section MAJUSCULES — port de spec/src/components/settings/SectionHeader.tsx. */
@Composable
fun SectionHeader(label: String) {
    Text(
        text = label.uppercase(),
        fontSize = FontSize.xs,
        fontWeight = FontWeight.SemiBold,
        color = AppTheme.colors.textMuted,
        letterSpacing = 0.8.sp,
        modifier = Modifier.padding(
            start = Spacing.lg,
            end = Spacing.lg,
            top = Spacing.xl,
            bottom = Spacing.sm,
        ),
    )
}
