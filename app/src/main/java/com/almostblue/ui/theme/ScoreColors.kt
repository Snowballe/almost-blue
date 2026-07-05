package com.almostblue.ui.theme

import androidx.compose.ui.graphics.Color
import com.almostblue.domain.scoreGradientRgb

/** Conversion Compose du gradient de score (rouge→jaune→vert) du domaine. */
fun scoreGradientColor(score: Double): Color {
    val (r, g, b) = scoreGradientRgb(score)
    return Color(r, g, b)
}
