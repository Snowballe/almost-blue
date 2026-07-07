package com.almostblue.ui.theme

import androidx.compose.ui.graphics.Color
import com.almostblue.domain.scoreGradientRgb
import com.almostblue.domain.scoreTextOnGradientIsLight

/** Conversion Compose du gradient de score (rouge→jaune→vert) du domaine. */
fun scoreGradientColor(score: Double): Color {
    val (r, g, b) = scoreGradientRgb(score)
    return Color(r, g, b)
}

/**
 * Couleur de texte lisible posée sur scoreGradientColor : blanc sur les fonds
 * sombres (rouge et vert profonds), noir sur la zone claire (orange→jaune).
 * Indépendante du thème — le fond du badge l'est aussi.
 */
fun scoreOnGradientColor(score: Double, colors: AppColors): Color =
    if (scoreTextOnGradientIsLight(score)) colors.white else colors.black
