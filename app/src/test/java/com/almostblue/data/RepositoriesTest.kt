package com.almostblue.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import com.almostblue.domain.SeasonBound
import com.almostblue.domain.WeatherScore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * Port des tests de stores Zustand (useSettingsStore 23, useSectorsStore 8,
 * useNotificationStore 13) — ré-dérivés du même contrat : état initial,
 * setters champ à champ, resets, toggle atomique, persistance des scores.
 */
class RepositoriesTest {

    @get:Rule
    val tmp = TemporaryFolder()

    private var storeCount = 0

    private fun TestScope.newDataStore(): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(
            scope = backgroundScope,
            produceFile = { tmp.newFile("test-${storeCount++}.preferences_pb") },
        )

    // ─── SettingsRepository ─────────────────────────────────────────────────────

    @Test
    fun `settings - etat initial = defauts de la v1_3`() = runTest {
        val repo = SettingsRepository(newDataStore())
        val s = repo.settings.first()
        assertTrue(s.notificationsEnabled)
        assertEquals(180, s.checkIntervalMinutes)
        assertFalse(s.notificationsInSummer)
        assertTrue(s.hibernationEnabled)
        assertEquals(ColorScheme.DARK, s.colorScheme)
        assertEquals(SeasonBound(11, 1), s.offseasonStart)
        assertEquals(SeasonBound(3, 31), s.offseasonEnd)
        assertFalse(s.overrideHibernation)
        assertTrue(s.digestEnabled)
        assertEquals(10, s.digestHour)
        assertFalse(s.reliabilityPromptDone)
    }

    @Test
    fun `settings - chaque setter persiste sa valeur`() = runTest {
        val repo = SettingsRepository(newDataStore())
        repo.setNotificationsEnabled(false)
        repo.setCheckIntervalMinutes(720)
        repo.setNotificationsInSummer(true)
        repo.setHibernationEnabled(false)
        repo.setColorScheme(ColorScheme.LIGHT)
        repo.setOffseasonStart(SeasonBound(10, 15))
        repo.setOffseasonEnd(SeasonBound(4, 15))
        repo.setOverrideHibernation(true)
        repo.setDigestEnabled(false)
        repo.setDigestHour(7)
        repo.setReliabilityPromptDone(true)

        val s = repo.settings.first()
        assertFalse(s.notificationsEnabled)
        assertEquals(720, s.checkIntervalMinutes)
        assertTrue(s.notificationsInSummer)
        assertFalse(s.hibernationEnabled)
        assertEquals(ColorScheme.LIGHT, s.colorScheme)
        assertEquals(SeasonBound(10, 15), s.offseasonStart)
        assertEquals(SeasonBound(4, 15), s.offseasonEnd)
        assertTrue(s.overrideHibernation)
        assertFalse(s.digestEnabled)
        assertEquals(7, s.digestHour)
        assertTrue(s.reliabilityPromptDone)
    }

    @Test
    fun `settings - les intervalles autorises correspondent a la v1_3`() {
        assertEquals(listOf(60, 180, 360, 720, 1440), CHECK_INTERVALS)
    }

    @Test
    fun `settings - resetOffseasonDates ne touche que la fenetre`() = runTest {
        val repo = SettingsRepository(newDataStore())
        repo.setOffseasonStart(SeasonBound(9, 1))
        repo.setOffseasonEnd(SeasonBound(5, 15))
        repo.setDigestHour(8) // doit survivre au reset des dates

        repo.resetOffseasonDates()

        val s = repo.settings.first()
        assertEquals(SeasonBound(11, 1), s.offseasonStart)
        assertEquals(SeasonBound(3, 31), s.offseasonEnd)
        assertEquals(8, s.digestHour)
    }

    @Test
    fun `settings - resetAll remet tous les defauts`() = runTest {
        val repo = SettingsRepository(newDataStore())
        repo.setNotificationsEnabled(false)
        repo.setDigestHour(23)
        repo.setColorScheme(ColorScheme.LIGHT)

        repo.resetAll()

        assertEquals(Settings(), repo.settings.first())
    }

    @Test
    fun `settings - colorScheme corrompu retombe sur DARK`() = runTest {
        val dataStore = newDataStore()
        val repo = SettingsRepository(dataStore)
        // Simule une valeur inattendue écrite par une version antérieure
        dataStore.updateData {
            it.toMutablePreferences().apply {
                set(androidx.datastore.preferences.core.stringPreferencesKey("colorScheme"), "sepia")
            }
        }
        assertEquals(ColorScheme.DARK, repo.settings.first().colorScheme)
    }

    // ─── SectorsRepository ──────────────────────────────────────────────────────

    @Test
    fun `favoris - etat initial vide`() = runTest {
        val repo = SectorsRepository(newDataStore())
        assertEquals(emptyList<String>(), repo.favoriteIds.first())
    }

    @Test
    fun `favoris - toggle ajoute puis retire`() = runTest {
        val repo = SectorsRepository(newDataStore())
        repo.toggleFavorite("buoux")
        assertEquals(listOf("buoux"), repo.favoriteIds.first())
        repo.toggleFavorite("buoux")
        assertEquals(emptyList<String>(), repo.favoriteIds.first())
    }

    @Test
    fun `favoris - l'ordre d'insertion est preserve`() = runTest {
        val repo = SectorsRepository(newDataStore())
        repo.toggleFavorite("pen-hir")
        repo.toggleFavorite("buoux")
        repo.toggleFavorite("galamus")
        assertEquals(listOf("pen-hir", "buoux", "galamus"), repo.favoriteIds.first())
    }

    @Test
    fun `favoris - retirer un element du milieu conserve les autres`() = runTest {
        val repo = SectorsRepository(newDataStore())
        repo.toggleFavorite("pen-hir")
        repo.toggleFavorite("buoux")
        repo.toggleFavorite("galamus")
        repo.toggleFavorite("buoux")
        assertEquals(listOf("pen-hir", "galamus"), repo.favoriteIds.first())
    }

    // ─── NotificationRepository ─────────────────────────────────────────────────

    @Test
    fun `notifications - etat initial vide`() = runTest {
        val repo = NotificationRepository(newDataStore())
        assertEquals(emptyMap<String, WeatherScore>(), repo.lastScores.first())
        assertNull(repo.lastDigestDate.first())
        assertNull(repo.lastDigestSummary.first())
    }

    @Test
    fun `notifications - setScores persiste la map complete`() = runTest {
        val repo = NotificationRepository(newDataStore())
        val scores = mapOf(
            "buoux:S" to WeatherScore.GOOD,
            "buoux:SE" to WeatherScore.OK,
            "pen-hir:W" to WeatherScore.BAD,
        )
        repo.setScores(scores)
        assertEquals(scores, repo.lastScores.first())
    }

    @Test
    fun `notifications - setScores remplace (pas de merge)`() = runTest {
        val repo = NotificationRepository(newDataStore())
        repo.setScores(mapOf("buoux:S" to WeatherScore.GOOD))
        repo.setScores(mapOf("galamus:E" to WeatherScore.OK))
        assertEquals(mapOf("galamus:E" to WeatherScore.OK), repo.lastScores.first())
    }

    @Test
    fun `notifications - clearScores vide la map`() = runTest {
        val repo = NotificationRepository(newDataStore())
        repo.setScores(mapOf("buoux:S" to WeatherScore.GOOD))
        repo.clearScores()
        assertEquals(emptyMap<String, WeatherScore>(), repo.lastScores.first())
    }

    @Test
    fun `notifications - date et resume du dernier digest`() = runTest {
        val repo = NotificationRepository(newDataStore())
        repo.setLastDigestDate("2026-06-09")
        repo.setLastDigestSummary("Buoux — Face Sud : grimpable aujourd'hui !")
        assertEquals("2026-06-09", repo.lastDigestDate.first())
        assertEquals("Buoux — Face Sud : grimpable aujourd'hui !", repo.lastDigestSummary.first())
    }

    @Test
    fun `notifications - scores corrompus retombent sur map vide`() = runTest {
        val dataStore = newDataStore()
        val repo = NotificationRepository(dataStore)
        dataStore.updateData {
            it.toMutablePreferences().apply {
                set(androidx.datastore.preferences.core.stringPreferencesKey("lastScores"), "{pas du json")
            }
        }
        assertEquals(emptyMap<String, WeatherScore>(), repo.lastScores.first())
    }
}
