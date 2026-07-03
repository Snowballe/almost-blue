package com.almostblue

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.almostblue.notifications.sendTestNotification
import com.almostblue.ui.theme.AlmostBlueTheme
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize
import com.almostblue.ui.theme.Spacing
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            // On ne force rien — si l'utilisateur refuse, on respecte son choix.
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Demande de permission de notifier (Android 13+), comme useNotificationSetup v1.3.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setContent {
            AlmostBlueTheme {
                PlaceholderScreen(
                    onTestNotification = { sendTestNotification(this) },
                    onForcedCheck = {
                        val graph = AppGraph.get(this)
                        (application as AlmostBlueApp).appScope.launch {
                            graph.notificationRepo.clearScores()
                            graph.weatherNotifier.checkAndNotify(force = true)
                        }
                    },
                    onTestDigest = {
                        val graph = AppGraph.get(this)
                        (application as AlmostBlueApp).appScope.launch {
                            graph.weatherNotifier.sendDailyDigest(force = true)
                        }
                    },
                    onAddFavorite = {
                        val graph = AppGraph.get(this)
                        (application as AlmostBlueApp).appScope.launch {
                            graph.sectorsRepo.toggleFavorite("buoux")
                        }
                    },
                )
            }
        }
    }
}

/**
 * Écran provisoire — remplacé par la navigation en M4. Les boutons debug
 * (équivalents de la section Debug des réglages v1.3) servent à valider M3
 * sur device ; ils migreront dans SettingsScreen.
 */
@Composable
private fun PlaceholderScreen(
    onTestNotification: () -> Unit,
    onForcedCheck: () -> Unit,
    onTestDigest: () -> Unit,
    onAddFavorite: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.background)
            .padding(Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.md, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Almost Blue", color = AppTheme.colors.textPrimary, fontSize = FontSize.xxl)
        Text("Réécriture Kotlin — M3/M6", color = AppTheme.colors.textMuted, fontSize = FontSize.md)
        Text(
            "Notifications + background natifs · 151 tests verts",
            color = AppTheme.colors.textDisabled,
            fontSize = FontSize.sm,
        )

        val buttonColors = ButtonDefaults.buttonColors(
            containerColor = AppTheme.colors.accent,
            contentColor = AppTheme.colors.white,
        )
        Button(onClick = onAddFavorite, colors = buttonColors) {
            Text("① Basculer favori Buoux")
        }
        Button(onClick = onTestNotification, colors = buttonColors) {
            Text("② Envoyer une notif de test")
        }
        Button(onClick = onForcedCheck, colors = buttonColors) {
            Text("③ Forcer un check météo")
        }
        Button(onClick = onTestDigest, colors = buttonColors) {
            Text("④ Tester le digest quotidien")
        }
    }
}
