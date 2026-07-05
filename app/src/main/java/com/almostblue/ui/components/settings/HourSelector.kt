package com.almostblue.ui.components.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing

/** Sélecteur d'heure du résumé (− HHh00 +) — port de HourSelector.tsx. */
@Composable
fun HourSelector(
    value: Int,
    onChange: (Int) -> Unit,
) {
    val colors = AppTheme.colors
    Column {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
        ) {
            Text(
                "Heure du résumé",
                fontSize = FontSize.md,
                fontWeight = FontWeight.Medium,
                color = colors.textPrimary,
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.padding(top = 8.dp),
            ) {
                StepButton("−", onClick = { onChange((value + 23) % 24) })
                Text(
                    "%02dh00".format(value),
                    fontSize = FontSize.md,
                    fontWeight = FontWeight.Medium,
                    color = colors.accent,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.widthIn(min = 56.dp),
                )
                StepButton("+", onClick = { onChange((value + 1) % 24) })
            }
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}

@Composable
private fun StepButton(label: String, onClick: () -> Unit) {
    val colors = AppTheme.colors
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .border(1.dp, colors.border, CircleShape)
            .clickable(onClick = onClick),
    ) {
        Text(label, fontSize = FontSize.lg, color = colors.textPrimary)
    }
}
