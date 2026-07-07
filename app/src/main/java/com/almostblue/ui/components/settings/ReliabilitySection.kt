package com.almostblue.ui.components.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.almostblue.AppGraph
import com.almostblue.domain.PARIS_ZONE
import com.almostblue.domain.formatRelativeAge
import com.almostblue.notifications.ReliabilityStatus
import com.almostblue.notifications.getReliabilityStatus
import com.almostblue.notifications.isReliabilityOk
import com.almostblue.notifications.openAlarmPermissionSettings
import com.almostblue.notifications.openPowerManagerSettings
import com.almostblue.notifications.requestBatteryOptimizationExemption
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Section « Fiabilité des notifications » — port de ReliabilitySection.tsx.
 * L'état se rafraîchit au retour au premier plan (retour des réglages système).
 */
@Composable
fun ReliabilitySection() {
    val context = LocalContext.current
    var status by remember { mutableStateOf<ReliabilityStatus?>(null) }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                status = getReliabilityStatus(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val s = status ?: return

    if (isReliabilityOk(s)) {
        OkRow()
    } else {
        if (s.batteryOptimized) {
            FixRow(
                title = "Optimisation batterie",
                description = "Empêche le résumé de partir à l’heure quand l’app est fermée.",
                onFix = { requestBatteryOptimizationExemption(context) },
            )
        }
        if (!s.exactAlarmAllowed) {
            FixRow(
                title = "Alarmes exactes",
                description = "Nécessaire pour déclencher le résumé à l’heure pile.",
                onFix = { openAlarmPermissionSettings(context) },
            )
        }
        if (s.needsPowerManager) {
            FixRow(
                title = "Démarrage automatique",
                description = "Votre constructeur peut bloquer l’app en arrière-plan.",
                onFix = { openPowerManagerSettings(context) },
            )
        }
    }
    JournalRow()
}

private val DIGEST_FIRED_FORMAT = DateTimeFormatter.ofPattern("EEE d MMM HH:mm", Locale.FRENCH)

/**
 * Journal de fiabilité : derniers passages réels de la chaîne de fond
 * (check météo, digest). Sert à diagnostiquer Doze/OEM : si « Dernier check »
 * vieillit au-delà de l'intervalle configuré, quelque chose bloque en fond.
 */
@Composable
private fun JournalRow() {
    val colors = AppTheme.colors
    val repo = AppGraph.get(LocalContext.current).notificationRepo
    val lastCheckMs by repo.lastCheckAtMs.collectAsState(initial = null)
    val lastDigestMs by repo.lastDigestFiredAtMs.collectAsState(initial = null)

    val lastCheckLabel = lastCheckMs?.let {
        formatRelativeAge(Instant.ofEpochMilli(it).toString(), System.currentTimeMillis())
    } ?: "—"
    val lastDigestLabel = lastDigestMs?.let {
        DIGEST_FIRED_FORMAT.format(Instant.ofEpochMilli(it).atZone(PARIS_ZONE))
    } ?: "—"

    Column {
        Column(
            Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
        ) {
            Text(
                "Dernier check météo : $lastCheckLabel",
                fontSize = FontSize.sm,
                color = colors.textMuted,
                lineHeight = 18.sp,
            )
            Text(
                "Dernier digest : $lastDigestLabel",
                fontSize = FontSize.sm,
                color = colors.textMuted,
                lineHeight = 18.sp,
            )
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}

@Composable
private fun OkRow() {
    val colors = AppTheme.colors
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surface)
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = null,
                tint = colors.good,
                modifier = Modifier.size(18.dp),
            )
            Text(
                "Livraison à l’heure activée — le résumé quotidien partira à l’heure choisie.",
                fontSize = FontSize.sm,
                color = colors.good,
                lineHeight = 18.sp,
                modifier = Modifier.weight(1f),
            )
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}

@Composable
private fun FixRow(
    title: String,
    description: String,
    onFix: () -> Unit,
) {
    val colors = AppTheme.colors
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.warning.copy(alpha = 0x18 / 255f))
                .padding(horizontal = Spacing.lg, vertical = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        ) {
            Icon(
                Icons.Outlined.ErrorOutline,
                contentDescription = null,
                tint = colors.warning,
                modifier = Modifier.size(18.dp),
            )
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    fontSize = FontSize.md,
                    fontWeight = FontWeight.Medium,
                    color = colors.textPrimary,
                )
                Text(
                    description,
                    fontSize = FontSize.sm,
                    color = colors.textMuted,
                    lineHeight = 18.sp,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
            Text(
                "Régler",
                fontSize = FontSize.sm,
                fontWeight = FontWeight.Medium,
                color = colors.textPrimary,
                modifier = Modifier
                    .background(colors.accent, RoundedCornerShape(8.dp))
                    .clickable(onClick = onFix)
                    .padding(horizontal = Spacing.md, vertical = Spacing.sm),
            )
        }
        HorizontalDivider(color = colors.border, thickness = 1.dp)
    }
}
