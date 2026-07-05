package com.almostblue.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Port 1:1 de spec/__tests__/utils/orientationUtils.test.ts. */
class OrientationUtilsTest {

    @Test
    fun `chaque label contient la lettre directionnelle`() {
        for (o in Orientation.entries) {
            assertTrue("label de $o", o.label.contains(o.name))
        }
    }

    @Test
    fun `chaque label contient la bonne fleche`() {
        val arrows = mapOf(
            Orientation.N to "↑", Orientation.NE to "↗", Orientation.E to "→",
            Orientation.SE to "↘", Orientation.S to "↓", Orientation.SW to "↙",
            Orientation.W to "←", Orientation.NW to "↖",
        )
        for ((o, arrow) in arrows) {
            assertTrue("flèche de $o", o.label.contains(arrow))
        }
    }

    @Test
    fun `noms francais exacts`() {
        val expected = mapOf(
            Orientation.N to "Nord", Orientation.NE to "Nord-Est", Orientation.E to "Est",
            Orientation.SE to "Sud-Est", Orientation.S to "Sud", Orientation.SW to "Sud-Ouest",
            Orientation.W to "Ouest", Orientation.NW to "Nord-Ouest",
        )
        for ((o, name) in expected) {
            assertEquals(name, o.frenchName)
        }
    }
}
