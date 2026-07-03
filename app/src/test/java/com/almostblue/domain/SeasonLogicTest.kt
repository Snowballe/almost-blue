package com.almostblue.domain

import java.time.LocalDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Port 1:1 de spec/__tests__/utils/seasonLogic.test.ts. */
class SeasonLogicTest {

    // ─── maxDayForMonth ─────────────────────────────────────────────────────────

    @Test
    fun `mois a 31 jours`() {
        for (month in listOf(1, 3, 5, 7, 8, 10, 12)) {
            assertEquals("mois $month", 31, maxDayForMonth(month))
        }
    }

    @Test
    fun `mois a 30 jours`() {
        for (month in listOf(4, 6, 9, 11)) {
            assertEquals("mois $month", 30, maxDayForMonth(month))
        }
    }

    @Test
    fun `fevrier a 28 jours (pas de gestion bissextile)`() {
        assertEquals(28, maxDayForMonth(2))
    }

    // ─── isOffSeason — fenêtre par défaut (1er nov → 31 mars) ──────────────────

    @Test
    fun `milieu de l'hiver (15 dec) - hors-saison`() {
        assertTrue(isOffSeason(LocalDate.of(2026, 12, 15)))
    }

    @Test
    fun `milieu de l'ete (15 juil) - en saison`() {
        assertFalse(isOffSeason(LocalDate.of(2026, 7, 15)))
    }

    @Test
    fun `1er novembre - premier jour hors-saison - true`() {
        assertTrue(isOffSeason(LocalDate.of(2026, 11, 1)))
    }

    @Test
    fun `31 octobre - veille du debut - false`() {
        assertFalse(isOffSeason(LocalDate.of(2026, 10, 31)))
    }

    @Test
    fun `31 mars - dernier jour hors-saison - true`() {
        assertTrue(isOffSeason(LocalDate.of(2026, 3, 31)))
    }

    @Test
    fun `1er avril - lendemain de la fin - false`() {
        assertFalse(isOffSeason(LocalDate.of(2026, 4, 1)))
    }

    @Test
    fun `1er janvier (la fenetre chevauche le 31 dec) - hors-saison`() {
        assertTrue(isOffSeason(LocalDate.of(2026, 1, 1)))
    }

    @Test
    fun `15 decembre - hors-saison (meme comportement en changeant d'annee)`() {
        assertTrue(isOffSeason(LocalDate.of(2025, 12, 15)))
        assertTrue(isOffSeason(LocalDate.of(2027, 12, 15)))
    }

    // ─── isOffSeason — fenêtre personnalisée ───────────────────────────────────

    private val customStart = SeasonBound(month = 6, day = 1)  // 1er juin
    private val customEnd = SeasonBound(month = 9, day = 30)   // 30 sept (fenêtre dans l'année)

    @Test
    fun `15 aout - dans la fenetre - true`() {
        assertTrue(isOffSeason(LocalDate.of(2026, 8, 15), customStart, customEnd))
    }

    @Test
    fun `1er juin - premier jour - true`() {
        assertTrue(isOffSeason(LocalDate.of(2026, 6, 1), customStart, customEnd))
    }

    @Test
    fun `31 mai - veille - false`() {
        assertFalse(isOffSeason(LocalDate.of(2026, 5, 31), customStart, customEnd))
    }

    @Test
    fun `30 sept - dernier jour - true`() {
        assertTrue(isOffSeason(LocalDate.of(2026, 9, 30), customStart, customEnd))
    }

    @Test
    fun `1er octobre - hors fenetre - false`() {
        assertFalse(isOffSeason(LocalDate.of(2026, 10, 1), customStart, customEnd))
    }

    @Test
    fun `15 dec - hors fenetre - false`() {
        assertFalse(isOffSeason(LocalDate.of(2026, 12, 15), customStart, customEnd))
    }

    // ─── nextSeasonChangeDate ──────────────────────────────────────────────────

    @Test
    fun `en hiver - prochaine date = fin hors-saison (31 mars)`() {
        val result = nextSeasonChangeDate(LocalDate.of(2026, 12, 15))
        assertEquals(OFFSEASON_END.month, result.monthValue) // 3 = mars
        assertEquals(OFFSEASON_END.day, result.dayOfMonth)   // 31
    }

    @Test
    fun `en ete - prochaine date = debut hors-saison (1er nov)`() {
        val result = nextSeasonChangeDate(LocalDate.of(2026, 7, 15))
        assertEquals(OFFSEASON_START.month, result.monthValue) // 11 = nov
        assertEquals(OFFSEASON_START.day, result.dayOfMonth)   // 1
    }

    @Test
    fun `en fevrier - fin hors-saison cette annee (mars n'est pas encore passe)`() {
        val result = nextSeasonChangeDate(LocalDate.of(2026, 2, 15))
        assertEquals(2026, result.year)
        assertEquals(3, result.monthValue) // mars
        assertEquals(31, result.dayOfMonth)
    }

    @Test
    fun `en juillet - debut hors-saison cette annee (nov pas encore passe)`() {
        val result = nextSeasonChangeDate(LocalDate.of(2026, 7, 1))
        assertEquals(2026, result.year)
        assertEquals(11, result.monthValue) // nov
    }

    // ─── isDegenerate ──────────────────────────────────────────────────────────

    @Test
    fun `start egal end - degenere`() {
        assertTrue(isDegenerate(SeasonBound(6, 15), SeasonBound(6, 15)))
    }

    @Test
    fun `start different de end (config par defaut) - non degenere`() {
        assertFalse(isDegenerate(OFFSEASON_START, OFFSEASON_END))
    }

    @Test
    fun `dates differentes - non degenere`() {
        assertFalse(isDegenerate(SeasonBound(11, 1), SeasonBound(3, 31)))
    }
}
