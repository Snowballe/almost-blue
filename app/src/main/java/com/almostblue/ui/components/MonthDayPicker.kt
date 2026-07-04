package com.almostblue.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.almostblue.domain.SeasonBound
import com.almostblue.domain.maxDayForMonth
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing

val MONTHS_FR = listOf(
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
)

val MONTHS_FR_SHORT = listOf(
    "jan.", "fév.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
)

fun formatSeasonBound(b: SeasonBound): String = "${b.day} ${MONTHS_FR_SHORT[b.month - 1]}"

private val ITEM_H = 48.dp

/** Sélecteur mois + jour en 2 colonnes — port de spec/src/components/MonthDayPicker.tsx. */
@Composable
fun MonthDayPicker(
    title: String,
    value: SeasonBound,
    onChange: (SeasonBound) -> Unit,
    onClose: () -> Unit,
) {
    val colors = AppTheme.colors
    var localMonth by remember(value) { mutableIntStateOf(value.month) }
    var localDay by remember(value) { mutableIntStateOf(value.day) }

    Dialog(onDismissRequest = onClose) {
        Column(
            Modifier
                .widthIn(max = 360.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(colors.surface),
        ) {
            Text(
                title,
                fontSize = FontSize.md,
                fontWeight = FontWeight.SemiBold,
                color = colors.textPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = Spacing.lg, vertical = Spacing.lg),
            )
            HorizontalDivider(color = colors.border, thickness = 1.dp)

            Row(Modifier.padding(horizontal = Spacing.md, vertical = 0.dp).padding(top = Spacing.sm)) {
                ColumnLabel("Mois", Modifier.weight(1f))
                ColumnLabel("Jour", Modifier.weight(1f))
            }

            Row(
                Modifier
                    .height(ITEM_H * 5)
                    .padding(horizontal = Spacing.md, vertical = Spacing.xs),
            ) {
                PickerColumn(
                    labels = MONTHS_FR,
                    values = (1..12).toList(),
                    selected = localMonth,
                    onSelect = { m ->
                        localMonth = m
                        val max = maxDayForMonth(m)
                        if (localDay > max) localDay = max
                    },
                    modifier = Modifier.weight(1f),
                )
                Box(
                    Modifier
                        .width(1.dp)
                        .fillMaxHeight()
                        .padding(vertical = Spacing.xs)
                        .background(colors.border),
                )
                val dayMax = maxDayForMonth(localMonth)
                PickerColumn(
                    labels = (1..dayMax).map(Int::toString),
                    values = (1..dayMax).toList(),
                    selected = localDay,
                    onSelect = { localDay = it },
                    modifier = Modifier.weight(1f),
                )
            }

            HorizontalDivider(color = colors.border, thickness = 1.dp)
            Row {
                Text(
                    "Annuler",
                    fontSize = FontSize.md,
                    color = colors.textMuted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .weight(1f)
                        .clickable(onClick = onClose)
                        .padding(vertical = Spacing.md),
                )
                Box(
                    Modifier
                        .width(1.dp)
                        .height(ITEM_H)
                        .background(colors.border),
                )
                Text(
                    "Confirmer",
                    fontSize = FontSize.md,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.accent,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .weight(1f)
                        .clickable {
                            onChange(SeasonBound(month = localMonth, day = localDay))
                            onClose()
                        }
                        .padding(vertical = Spacing.md),
                )
            }
        }
    }
}

@Composable
private fun ColumnLabel(label: String, modifier: Modifier = Modifier) {
    Text(
        label.uppercase(),
        fontSize = FontSize.xs,
        fontWeight = FontWeight.SemiBold,
        color = AppTheme.colors.textMuted,
        letterSpacing = 0.8.sp,
        textAlign = TextAlign.Center,
        modifier = modifier,
    )
}

@Composable
private fun PickerColumn(
    labels: List<String>,
    values: List<Int>,
    selected: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    val listState = rememberLazyListState()

    // Centre l'élément sélectionné dans la fenêtre de 5 lignes (viewPosition 0.5).
    LaunchedEffect(selected, values) {
        val idx = values.indexOf(selected)
        if (idx >= 0) {
            listState.animateScrollToItem(
                index = maxOf(0, idx - 2),
            )
        }
    }

    LazyColumn(state = listState, modifier = modifier) {
        items(values.size) { i ->
            val active = values[i] == selected
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(ITEM_H)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (active) colors.accent.copy(alpha = 0x22 / 255f) else colors.surface)
                    .clickable { onSelect(values[i]) },
            ) {
                Text(
                    labels[i],
                    fontSize = FontSize.md,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (active) colors.accent else colors.textMuted,
                )
            }
        }
    }
}
