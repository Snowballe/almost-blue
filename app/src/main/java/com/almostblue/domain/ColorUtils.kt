package com.almostblue.domain

import kotlin.math.roundToInt

/**
 * Gradient de couleur du score — port de spec/src/utils/colorUtils.ts.
 * Le TS retournait une string CSS `rgb(r,g,b)` (format React Native) ; ici on
 * retourne le triplet (r, g, b), que la couche UI convertit en Color Compose.
 * Les valeurs de calibration sont identiques.
 */

// Stops RGB du gradient de score : rouge (0) → jaune (5) → vert (10)
private val RED = intArrayOf(178, 34, 34)
private val YELLOW = intArrayOf(238, 210, 2)
private val GREEN = intArrayOf(0, 128, 0) // #008000

private fun lerp(a: IntArray, b: IntArray, t: Double): Triple<Int, Int, Int> = Triple(
    (a[0] + t * (b[0] - a[0])).roundToInt(),
    (a[1] + t * (b[1] - a[1])).roundToInt(),
    (a[2] + t * (b[2] - a[2])).roundToInt(),
)

/** Mappe un score météo [0–10] sur un dégradé continu rouge→jaune→vert. */
fun scoreGradientRgb(score: Double): Triple<Int, Int, Int> {
    val t = score.coerceIn(0.0, 10.0) / 10.0
    return if (t <= 0.5) {
        lerp(RED, YELLOW, t / 0.5)
    } else {
        lerp(YELLOW, GREEN, (t - 0.5) / 0.5)
    }
}

// Luminance relative (WCAG) en dessous de laquelle un texte blanc contraste
// mieux qu'un texte noir : croisement exact à √0.0525 − 0.05 ≈ 0.179.
private const val WHITE_TEXT_LUMINANCE_THRESHOLD = 0.179

private fun srgbToLinear(channel: Int): Double {
    val c = channel / 255.0
    return if (c <= 0.03928) c / 12.92 else Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Luminance relative (WCAG 2.x) d'un triplet sRGB [0–255]. */
private fun relativeLuminance(rgb: Triple<Int, Int, Int>): Double =
    0.2126 * srgbToLinear(rgb.first) +
        0.7152 * srgbToLinear(rgb.second) +
        0.0722 * srgbToLinear(rgb.third)

/**
 * Le texte posé sur la couleur de score doit-il être blanc (true) ou noir ?
 * Blanc sur les extrémités sombres du gradient (rouge profond, vert profond),
 * noir sur la zone claire du milieu (orange → jaune → vert clair).
 */
fun scoreTextOnGradientIsLight(score: Double): Boolean =
    relativeLuminance(scoreGradientRgb(score)) < WHITE_TEXT_LUMINANCE_THRESHOLD
