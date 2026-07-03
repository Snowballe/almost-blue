package com.almostblue

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.almostblue.ui.theme.AlmostBlueTheme
import com.almostblue.ui.theme.AppTheme
import com.almostblue.ui.theme.FontSize

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AlmostBlueTheme {
                PlaceholderScreen()
            }
        }
    }
}

/** Écran provisoire M0 — remplacé par la navigation en M4. */
@Composable
private fun PlaceholderScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colors.background),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Almost Blue", color = AppTheme.colors.textPrimary, fontSize = FontSize.xxl)
        Text("Réécriture Kotlin — M2/M6", color = AppTheme.colors.textMuted, fontSize = FontSize.md)
        Text(
            "Moteur météo + data portés · 110 tests verts\nUI en cours (M4), carte (M5)",
            color = AppTheme.colors.textDisabled,
            fontSize = FontSize.sm,
        )
    }
}
