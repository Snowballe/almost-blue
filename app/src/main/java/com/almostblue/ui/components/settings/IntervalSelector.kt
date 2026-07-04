package com.almostblue.ui.components.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.almostblue.data.CHECK_INTERVALS
import com.almostblue.data.CHECK_INTERVAL_LABELS
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing

/** Chips de fréquence de vérification (1h→24h) — port d'IntervalSelector.tsx. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun IntervalSelector(
    value: Int,
    onChange: (Int) -> Unit,
) {
    val colors = AppTheme.colors
    Column {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(
                    start = Spacing.lg,
                    end = Spacing.lg,
                    top = Spacing.md,
                    bottom = Spacing.sm,
                ),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text(
                "Fréquence de vérification",
                fontSize = FontSize.md,
                fontWeight = FontWeight.Medium,
                color = colors.textPrimary,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (interval in CHECK_INTERVALS) {
                    val active = interval == value
                    val shape = RoundedCornerShape(20.dp)
                    Text(
                        CHECK_INTERVAL_LABELS.getValue(interval),
                        fontSize = FontSize.sm,
                        fontWeight = FontWeight.Medium,
                        color = if (active) colors.accent else colors.textMuted,
                        modifier = Modifier
                            .border(1.dp, if (active) colors.accent else colors.border, shape)
                            .background(
                                if (active) colors.accent.copy(alpha = 0x22 / 255f) else Color.Transparent,
                                shape,
                            )
                            .clickable { onChange(interval) }
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                    )
                }
            }
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}
