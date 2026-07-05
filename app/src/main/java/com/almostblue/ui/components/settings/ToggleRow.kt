package com.almostblue.ui.components.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing

/** Ligne réglage + interrupteur — port de spec/src/components/settings/ToggleRow.tsx. */
@Composable
fun ToggleRow(
    label: String,
    description: String? = null,
    value: Boolean,
    onValueChange: (Boolean) -> Unit,
    enabled: Boolean = true,
    disabledNote: String? = null,
) {
    val colors = AppTheme.colors
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .alpha(if (enabled) 1f else 0.5f)
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.md),
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    label,
                    fontSize = FontSize.md,
                    fontWeight = FontWeight.Medium,
                    color = if (enabled) colors.textPrimary else colors.textMuted,
                )
                if (description != null) {
                    Text(
                        description,
                        fontSize = FontSize.sm,
                        color = colors.textMuted,
                        lineHeight = 18.sp,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
                if (!enabled && disabledNote != null) {
                    Text(
                        disabledNote,
                        fontSize = FontSize.xs,
                        color = colors.accent,
                        fontStyle = FontStyle.Italic,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            Switch(
                checked = value,
                onCheckedChange = onValueChange,
                enabled = enabled,
                colors = SwitchDefaults.colors(
                    checkedTrackColor = colors.accent,
                    uncheckedTrackColor = colors.border,
                    checkedThumbColor = colors.textPrimary,
                    uncheckedThumbColor = colors.textPrimary,
                ),
            )
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}
