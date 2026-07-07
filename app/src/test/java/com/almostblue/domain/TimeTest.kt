package com.almostblue.domain

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class TimeTest {

    private val now = Instant.parse("2026-07-07T12:00:00Z")

    private fun ageOf(fetchedAt: String) = formatRelativeAge(fetchedAt, now.toEpochMilli())

    @Test
    fun `moins de 60 s - a l'instant`() {
        assertEquals("à l'instant", ageOf("2026-07-07T11:59:30Z"))
    }

    @Test
    fun `minutes pleines - il y a X min`() {
        assertEquals("il y a 5 min", ageOf("2026-07-07T11:55:00Z"))
        assertEquals("il y a 59 min", ageOf("2026-07-07T11:01:00Z"))
    }

    @Test
    fun `au-dela d'une heure - il y a X h`() {
        assertEquals("il y a 1 h", ageOf("2026-07-07T11:00:00Z"))
        assertEquals("il y a 3 h", ageOf("2026-07-07T08:30:00Z"))
    }

    @Test
    fun `timestamp futur ou illisible - a l'instant`() {
        assertEquals("à l'instant", ageOf("2026-07-07T13:00:00Z"))
        assertEquals("à l'instant", ageOf("pas-une-date"))
    }
}
