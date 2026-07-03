package com.almostblue.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Garanties structurelles sur les topos — remplace le sanity-check __DEV__
 * de spec/src/data/sectors.ts, plus des comptages anti-oubli de transcription.
 */
class SectorsTest {

    @Test
    fun `tous les IDs (secteurs + sous-secteurs) sont uniques`() {
        val allIds = sectors.map { it.id } + sectors.flatMap { s -> s.subSectors.map { it.id } }
        val duplicates = allIds.groupingBy { it }.eachCount().filterValues { it > 1 }
        assertTrue("IDs en double : ${duplicates.keys}", duplicates.isEmpty())
    }

    @Test
    fun `transcription complete - 8 secteurs, 72 sous-secteurs`() {
        assertEquals(8, sectors.size)
        assertEquals(72, sectors.sumOf { it.subSectors.size })
    }

    @Test
    fun `comptage par secteur identique a la spec TS`() {
        val expected = mapOf(
            "pointe-de-primel" to 16,
            "ile-de-primel" to 16,
            "pen-hir" to 22,
            "buoux" to 3,
            "verdon-escalès" to 3,
            "calanques-morgiou" to 2,
            "galamus" to 2,
            "imperatrice-plougastel" to 8,
        )
        for (sector in sectors) {
            assertEquals("sous-secteurs de ${sector.id}", expected[sector.id], sector.subSectors.size)
        }
    }

    @Test
    fun `chaque sous-secteur a un nom non vide`() {
        for (s in sectors) {
            for (ss in s.subSectors) {
                assertTrue("nom vide pour ${ss.id}", ss.name.isNotBlank())
            }
        }
    }
}
