package com.almostblue.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.almostblue.AppGraph
import com.almostblue.data.ColorScheme
import com.almostblue.data.Settings
import com.almostblue.domain.isDegenerate
import com.almostblue.notifications.sendTestNotification
import com.almostblue.ui.components.MonthDayPicker
import com.almostblue.ui.components.formatSeasonBound
import com.almostblue.ui.components.settings.DateRow
import com.almostblue.ui.components.settings.HourSelector
import com.almostblue.ui.components.settings.IntervalSelector
import com.almostblue.ui.components.settings.ReliabilitySection
import com.almostblue.ui.components.settings.SectionHeader
import com.almostblue.ui.components.settings.ToggleRow
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing
import kotlinx.coroutines.launch

private enum class PickerTarget { START, END }

/**
 * Écran Réglages — port de spec/src/screens/SettingsScreen.tsx.
 * Les mutations passent par SettingsRepository ; la re-planification
 * (WorkManager + alarme digest) est réactive, voir AlmostBlueApp.
 */
@Composable
fun SettingsScreen(settings: Settings) {
    val colors = AppTheme.colors
    val context = LocalContext.current
    val graph = AppGraph.get(context)
    val scope = rememberCoroutineScope()
    val repo = graph.settingsRepo

    var pickerTarget by remember { mutableStateOf<PickerTarget?>(null) }
    var confirmReset by remember { mutableStateOf(false) }
    val datesAreDegen = isDegenerate(settings.offseasonStart, settings.offseasonEnd)

    Column(
        Modifier
            .fillMaxSize()
            .background(colors.background)
            .verticalScroll(rememberScrollState())
            .padding(bottom = Spacing.xxxl),
    ) {
        // ── Notifications ──
        SectionHeader("Notifications")

        ToggleRow(
            label = "Alertes météo",
            description = "Notifie quand les conditions deviennent favorables sur un secteur favori.",
            value = settings.notificationsEnabled,
            onValueChange = { v -> scope.launch { repo.setNotificationsEnabled(v) } },
        )

        if (settings.notificationsEnabled) {
            IntervalSelector(
                value = settings.checkIntervalMinutes,
                onChange = { v -> scope.launch { repo.setCheckIntervalMinutes(v) } },
            )
            ToggleRow(
                label = "Résumé quotidien",
                description = "Récap des secteurs favoris chaque jour à %02dh.".format(settings.digestHour),
                value = settings.digestEnabled,
                onValueChange = { v -> scope.launch { repo.setDigestEnabled(v) } },
            )
            if (settings.digestEnabled) {
                HourSelector(
                    value = settings.digestHour,
                    onChange = { h -> scope.launch { repo.setDigestHour(h) } },
                )
                ReliabilitySection()
            }
            ToggleRow(
                label = "Alertes en été",
                description = "Envoie des alertes météo même en dehors de la hors-saison.",
                value = settings.notificationsInSummer,
                onValueChange = { v -> scope.launch { repo.setNotificationsInSummer(v) } },
            )
        }

        // ── Saison ──
        SectionHeader("Saison")

        ToggleRow(
            label = "Hibernation estivale",
            description = "Affiche un écran de mise en veille hors de la fenêtre hors-saison.",
            value = settings.hibernationEnabled,
            onValueChange = { v -> scope.launch { repo.setHibernationEnabled(v) } },
        )

        // ── Fenêtre hors-saison ──
        SectionHeader("Fenêtre hors-saison")

        DateRow(
            label = "Début",
            value = formatSeasonBound(settings.offseasonStart),
            onPress = { pickerTarget = PickerTarget.START },
        )
        DateRow(
            label = "Fin",
            value = formatSeasonBound(settings.offseasonEnd),
            onPress = { pickerTarget = PickerTarget.END },
        )

        if (datesAreDegen) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.warning.copy(alpha = 0x18 / 255f))
                        .padding(horizontal = Spacing.lg, vertical = Spacing.md),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
                ) {
                    Icon(
                        Icons.Filled.Warning,
                        contentDescription = null,
                        tint = colors.warning,
                        modifier = Modifier.size(16.dp).padding(top = 1.dp),
                    )
                    Text(
                        "Début et fin identiques — toute l'année sera considérée hors-saison.",
                        fontSize = FontSize.sm,
                        color = colors.warning,
                        lineHeight = 18.sp,
                        modifier = Modifier.weight(1f),
                    )
                }
                HorizontalDivider(color = colors.border, thickness = 1.dp)
            }
        }

        Column {
            Text(
                "Réinitialiser aux dates par défaut (1er nov. → 31 mars)",
                fontSize = FontSize.sm,
                color = colors.accent,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { scope.launch { repo.resetOffseasonDates() } }
                    .padding(horizontal = Spacing.lg, vertical = Spacing.md),
            )
            HorizontalDivider(color = colors.border, thickness = 1.dp)
        }

        // ── Apparence ──
        SectionHeader("Apparence")

        ToggleRow(
            label = "Thème clair",
            description = "Passe à une interface claire.",
            value = settings.colorScheme == ColorScheme.LIGHT,
            onValueChange = { v ->
                scope.launch { repo.setColorScheme(if (v) ColorScheme.LIGHT else ColorScheme.DARK) }
            },
        )

        // ── Debug ──
        SectionHeader("Debug")

        DebugButton("Envoyer une notif de test") {
            sendTestNotification(context)
        }
        DebugButton("Forcer un check météo (ignore la saison)") {
            scope.launch {
                graph.notificationRepo.clearScores()
                runCatching { graph.weatherNotifier.checkAndNotify(force = true) }
            }
        }
        DebugButton("Tester le digest quotidien") {
            scope.launch {
                runCatching { graph.weatherNotifier.sendDailyDigest(force = true) }
            }
        }
        DebugButton("Remettre les réglages par défaut", color = colors.danger) {
            confirmReset = true
        }

        // ── À propos ──
        SectionHeader("À propos")

        Column(
            Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Text(
                "Almost Blue",
                fontSize = FontSize.md,
                fontWeight = FontWeight.Bold,
                color = colors.textPrimary,
            )
            Text(
                "Conditions météo pour les grimpeurs·ses outdoor, en dehors de la saison estivale.",
                fontSize = FontSize.sm,
                color = colors.textMuted,
                lineHeight = 18.sp,
            )
            Text(
                "Données météo : Open-Meteo (open-meteo.com)",
                fontSize = FontSize.sm,
                color = colors.textMuted,
                lineHeight = 18.sp,
            )
            Text(
                "Fonds de carte : OpenStreetMap contributors",
                fontSize = FontSize.sm,
                color = colors.textMuted,
                lineHeight = 18.sp,
            )
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }

    // ── Pickers ──
    when (pickerTarget) {
        PickerTarget.START -> MonthDayPicker(
            title = "Début de la hors-saison",
            value = settings.offseasonStart,
            onChange = { v -> scope.launch { repo.setOffseasonStart(v) } },
            onClose = { pickerTarget = null },
        )
        PickerTarget.END -> MonthDayPicker(
            title = "Fin de la hors-saison",
            value = settings.offseasonEnd,
            onChange = { v -> scope.launch { repo.setOffseasonEnd(v) } },
            onClose = { pickerTarget = null },
        )
        null -> Unit
    }

    if (confirmReset) {
        AlertDialog(
            onDismissRequest = { confirmReset = false },
            containerColor = colors.surface,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textMuted,
            title = { Text("Remettre les réglages par défaut ?") },
            text = {
                Text("Tous les réglages seront réinitialisés (notifications, hibernation, saison, thème).")
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmReset = false
                    scope.launch { repo.resetAll() }
                }) {
                    Text("Réinitialiser", color = colors.danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmReset = false }) {
                    Text("Annuler", color = colors.textMuted)
                }
            },
        )
    }
}

@Composable
private fun DebugButton(
    label: String,
    color: androidx.compose.ui.graphics.Color? = null,
    onClick: () -> Unit,
) {
    val colors = AppTheme.colors
    Column {
        Text(
            label,
            fontSize = FontSize.sm,
            color = color ?: colors.textMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .clickable(onClick = onClick)
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
        )
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}
