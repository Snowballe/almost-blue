package com.almostblue.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Port 1:1 de spec/__tests__/utils/colorUtils.test.ts (mêmes triplets attendus). */
class ColorUtilsTest {

    @Test
    fun `score 0 - rouge pur (178,34,34)`() {
        assertEquals(Triple(178, 34, 34), scoreGradientRgb(0.0))
    }

    @Test
    fun `score 10 - vert pur (0,128,0)`() {
        assertEquals(Triple(0, 128, 0), scoreGradientRgb(10.0))
    }

    @Test
    fun `score 5 - jaune pur (238,210,2)`() {
        assertEquals(Triple(238, 210, 2), scoreGradientRgb(5.0))
    }

    @Test
    fun `score 2,5 - mi-chemin rouge vers jaune`() {
        // t = 0.25 → lerp(RED, YELLOW, 0.5)
        // r = round(178 + 0.5*(238-178)) = 208
        // g = round(34  + 0.5*(210-34))  = 122
        // b = round(34  + 0.5*(2-34))    = 18
        assertEquals(Triple(208, 122, 18), scoreGradientRgb(2.5))
    }

    @Test
    fun `score 7,5 - mi-chemin jaune vers vert`() {
        // t = 0.75 → lerp(YELLOW, GREEN, 0.5)
        // r = round(238 + 0.5*(0-238))   = 119
        // g = round(210 + 0.5*(128-210)) = 169
        // b = round(2   + 0.5*(0-2))     = 1
        assertEquals(Triple(119, 169, 1), scoreGradientRgb(7.5))
    }

    @Test
    fun `score negatif - clampe a 0 (rouge pur)`() {
        assertEquals(Triple(178, 34, 34), scoreGradientRgb(-1.0))
    }

    @Test
    fun `score au-dela de 10 - clampe a 10 (vert pur)`() {
        assertEquals(Triple(0, 128, 0), scoreGradientRgb(11.0))
    }

    // ── Couleur de texte sur le gradient ────────────────────────────────────────

    @Test
    fun `texte blanc sur le rouge profond (score 0)`() {
        assertTrue(scoreTextOnGradientIsLight(0.0))
    }

    @Test
    fun `texte noir sur le jaune (score 5)`() {
        assertFalse(scoreTextOnGradientIsLight(5.0))
    }

    @Test
    fun `texte noir sur le vert clair intermediaire (score 7,5)`() {
        assertFalse(scoreTextOnGradientIsLight(7.5))
    }

    @Test
    fun `texte blanc sur le vert profond (score 10)`() {
        assertTrue(scoreTextOnGradientIsLight(10.0))
    }
}
