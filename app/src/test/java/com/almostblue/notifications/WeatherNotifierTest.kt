package com.almostblue.notifications

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import com.almostblue.data.NotificationRepository
import com.almostblue.data.Sector
import com.almostblue.data.SectorsRepository
import com.almostblue.data.SettingsRepository
import com.almostblue.data.SubSector
import com.almostblue.data.sectors
import com.almostblue.domain.GoodWindow
import com.almostblue.domain.Orientation
import com.almostblue.domain.RockType
import com.almostblue.domain.SubSectorSummary
import com.almostblue.domain.WeatherForecast
import com.almostblue.domain.WeatherScore
import java.io.IOException
import java.time.LocalDate
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

/**
 * Port 1:1 de spec/__tests__/services/notificationService.test.ts (40 tests).
 * Les mocks Jest (getCachedForecast, getSubSectorSummary, notifee) deviennent
 * des lambdas/fakes injectés ; les setState() Zustand, des écritures repos.
 */
class WeatherNotifierTest {

    @get:Rule
    val tmp = TemporaryFolder()

    // Jour de hors-saison (décembre → isOffSeason = true) — WINTER_DATE de la spec
    private val winterDay: LocalDate = LocalDate.of(2026, 12, 15)

    private val emptyForecast = WeatherForecast(slots = emptyList(), fetchedAt = "")

    private val badSummary = SubSectorSummary(WeatherScore.BAD, 2.0, null)
    private fun goodSummary(date: String = "2026-12-15") =
        SubSectorSummary(WeatherScore.GOOD, 8.0, GoodWindow(date, 10, 18))

    // Fixtures secteurs minimalistes de la spec
    private val sectorSingle = Sector(
        id = "test-single", name = "Falaise Test", latitude = 44.0, longitude = 5.0,
        subSectors = listOf(SubSector("ss1", "Face Sud", Orientation.S, RockType.SLOW)),
    )
    private val sectorMulti = Sector(
        id = "test-multi", name = "Falaise Multi", latitude = 44.0, longitude = 5.0,
        subSectors = listOf(
            SubSector("ss1", "Face Sud", Orientation.S, RockType.SLOW),
            SubSector("ss2", "Face Ouest", Orientation.W, RockType.SLOW),
        ),
    )

    // Même face N en deux roches (le cas Pen-Hir : Menhir FAST vs Face nord SLOW)
    private val sectorMixedRock = Sector(
        id = "test-mixed", name = "Falaise Mixte", latitude = 44.0, longitude = 5.0,
        subSectors = listOf(
            SubSector("mr1", "Le Pilier", Orientation.N, RockType.FAST),
            SubSector("mr2", "Grande Face Nord", Orientation.N, RockType.SLOW),
            SubSector("mr3", "Face Sud", Orientation.S, RockType.FAST),
        ),
    )

    /** Notifier factice : enregistre les notifications affichées. */
    private class FakeNotifier : Notifier {
        val displayed = mutableListOf<AppNotification>()
        override fun display(notification: AppNotification) {
            displayed.add(notification)
        }
    }

    /** Harnais : repos DataStore réels + fakes injectés, état par défaut de la spec. */
    private inner class Harness(private val scope: TestScope) {
        private var count = 0
        private fun newStore(): DataStore<Preferences> = PreferenceDataStoreFactory.create(
            scope = scope.backgroundScope,
            produceFile = { tmp.newFile("notif-${count++}.preferences_pb") },
        )

        val settingsRepo = SettingsRepository(newStore())
        val sectorsRepo = SectorsRepository(newStore())
        val notificationRepo = NotificationRepository(newStore())
        val notifier = FakeNotifier()

        var today: LocalDate = winterDay
        var summarize: Summarizer = { _, _, _, _ -> badSummary }
        var fetch: suspend (Double, Double) -> WeatherForecast = { _, _ -> emptyForecast }
        var allSectors: List<Sector> = sectors

        suspend fun setupDefaults() {
            sectorsRepo.toggleFavorite("buoux")
        }

        fun build() = WeatherNotifier(
            settingsRepo = settingsRepo,
            sectorsRepo = sectorsRepo,
            notificationRepo = notificationRepo,
            fetchForecast = { lat, lon -> fetch(lat, lon) },
            notifier = notifier,
            summarize = { f, o, r, h -> summarize(f, o, r, h) },
            allSectors = allSectors,
            today = { today },
        )
    }

    // ─── gardes d'entrée (checkAndNotify) ───────────────────────────────────────

    @Test
    fun `ne notifie pas si notificationsEnabled=false`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.settingsRepo.setNotificationsEnabled(false)
        h.build().checkAndNotify()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `ne notifie pas si favoriteIds est vide`() = runTest {
        val h = Harness(this) // pas de favori
        h.build().checkAndNotify()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `ne notifie pas en ete si notificationsInSummer=false`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.today = LocalDate.of(2026, 7, 15) // été
        h.summarize = { _, _, _, _ -> goodSummary("2026-07-15") }
        h.build().checkAndNotify()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `notifie en ete si notificationsInSummer=true`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.today = LocalDate.of(2026, 7, 15)
        h.settingsRepo.setNotificationsInSummer(true)
        h.summarize = { _, _, _, _ -> goodSummary("2026-07-15") }
        h.build().checkAndNotify()
        assertEquals(1, h.notifier.displayed.size)
    }

    @Test
    fun `ignore un secteur si le fetch rejette (erreur reseau)`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.fetch = { _, _ -> throw IOException("réseau") }
        h.build().checkAndNotify() // pas de crash
        assertTrue(h.notifier.displayed.isEmpty())
    }

    // ─── détection de transition bad → good ─────────────────────────────────────

    @Test
    fun `envoie une notif quand un score passe de bad a good`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setScores(mapOf("buoux:S" to WeatherScore.BAD))
        h.summarize = { _, orientation, _, _ ->
            if (orientation == Orientation.S) goodSummary() else badSummary
        }
        h.build().checkAndNotify()
        assertEquals(1, h.notifier.displayed.size)
        val title = h.notifier.displayed[0].title
        assertTrue(title.contains("Falaise de Buoux"))
        assertTrue(title.contains("grimpable aujourd'hui !"))
    }

    @Test
    fun `ne notifie pas si toutes les orientations etaient deja good (pas de transition)`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        // buoux a S + SE : les deux étaient déjà good → aucune transition
        h.notificationRepo.setScores(mapOf("buoux:S" to WeatherScore.GOOD, "buoux:SE" to WeatherScore.GOOD))
        h.summarize = { _, _, _, _ -> SubSectorSummary(WeatherScore.GOOD, 8.0, null) }
        h.build().checkAndNotify()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `l'alerte porte l'id du secteur en stableKey (remplacement par spot)`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setScores(mapOf("buoux:S" to WeatherScore.BAD))
        h.summarize = { _, orientation, _, _ ->
            if (orientation == Orientation.S) goodSummary() else badSummary
        }
        h.build().checkAndNotify()
        assertEquals("buoux", h.notifier.displayed[0].stableKey)
    }

    @Test
    fun `force=true declenche meme si notificationsEnabled=false`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.settingsRepo.setNotificationsEnabled(false)
        h.summarize = { _, _, _, _ -> goodSummary() }
        h.build().checkAndNotify(force = true)
        assertEquals(1, h.notifier.displayed.size)
    }

    // ─── corps du message ───────────────────────────────────────────────────────
    // Buoux : orientations dédupliquées S (Le Toit) + SE (La Dalle) — 2 orientations

    @Test
    fun `une seule orientation good - La face X est seche (nom du secteur dans le titre)`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setScores(mapOf("buoux:SE" to WeatherScore.GOOD, "buoux:S" to WeatherScore.BAD))
        h.summarize = { _, orientation, _, _ ->
            if (orientation == Orientation.S) goodSummary()
            else SubSectorSummary(WeatherScore.GOOD, 8.0, null) // SE déjà good → pas de transition
        }
        h.build().checkAndNotify()
        val call = h.notifier.displayed[0]
        assertTrue(call.title.contains("Falaise de Buoux"))
        assertTrue(call.body.startsWith("La face Sud est sèche"))
        assertTrue(call.body.contains("Le Toit"))
    }

    @Test
    fun `deux orientations good sur trois - Les faces X et Y sont seches`() = runTest {
        // verdon-escalès : 3 orientations uniques — S (Luna Bong), E (Dalle du Fond), N (Rive Gauche)
        val h = Harness(this)
        h.sectorsRepo.toggleFavorite("verdon-escalès")
        h.summarize = { _, orientation, _, _ ->
            if (orientation == Orientation.N) badSummary else goodSummary()
        }
        h.build().checkAndNotify()
        val call = h.notifier.displayed[0]
        assertTrue(call.title.contains("Verdon"))
        assertTrue(Regex("Les faces .* et .* sont sèches").containsMatchIn(call.body))
        assertFalse(call.body.contains("Verdon"))
    }

    @Test
    fun `toutes les orientations good - Toutes les faces sont seches !`() = runTest {
        val h = Harness(this)
        h.sectorsRepo.toggleFavorite("verdon-escalès")
        h.summarize = { _, _, _, _ -> goodSummary() }
        h.build().checkAndNotify()
        val call = h.notifier.displayed[0]
        assertTrue(call.title.contains("Verdon"))
        assertEquals("Toutes les faces sont sèches !", call.body)
    }

    // ─── suivi par (orientation, roche) ─────────────────────────────────────────

    @Test
    fun `deux roches d'une meme face sont suivies separement`() = runTest {
        val h = Harness(this)
        h.allSectors = sectors + sectorMixedRock
        h.sectorsRepo.toggleFavorite("test-mixed")
        // Seule la roche SLOW de la face N est sèche
        h.summarize = { _, orientation, rockType, _ ->
            if (orientation == Orientation.N && rockType == RockType.SLOW) goodSummary() else badSummary
        }
        h.build().checkAndNotify()
        assertEquals(1, h.notifier.displayed.size)
        val call = h.notifier.displayed[0]
        assertTrue(call.body.startsWith("La face Nord est sèche"))
        // Recommande le sous-secteur SLOW, pas le FAST de la même face
        assertTrue(call.body.contains("Allez sur Grande Face Nord"))
    }

    @Test
    fun `meme face good en deux roches - le message ne duplique pas le nom de la face`() = runTest {
        val h = Harness(this)
        h.allSectors = sectors + sectorMixedRock
        h.sectorsRepo.toggleFavorite("test-mixed")
        h.summarize = { _, orientation, _, _ ->
            if (orientation == Orientation.N) goodSummary() else badSummary
        }
        h.build().checkAndNotify()
        val call = h.notifier.displayed[0]
        assertTrue(call.body.startsWith("La face Nord est sèche"))
        assertFalse(call.body.contains("Nord et Nord"))
    }

    @Test
    fun `cle legacy sans roche - pas de re-notification a la migration, scores re-ecrits au nouveau format`() = runTest {
        val h = Harness(this)
        h.allSectors = sectors + sectorMixedRock
        h.sectorsRepo.toggleFavorite("test-mixed")
        // Scores persistés par l'ancien format sectorId:orientation
        h.notificationRepo.setScores(
            mapOf("test-mixed:N" to WeatherScore.GOOD, "test-mixed:S" to WeatherScore.GOOD),
        )
        h.summarize = { _, _, _, _ -> goodSummary() }
        h.build().checkAndNotify()
        assertTrue(h.notifier.displayed.isEmpty()) // déjà GOOD via la clé legacy

        val persisted = h.notificationRepo.lastScores.first()
        assertEquals(WeatherScore.GOOD, persisted["test-mixed:N:FAST"])
        assertEquals(WeatherScore.GOOD, persisted["test-mixed:N:SLOW"])
        assertEquals(WeatherScore.GOOD, persisted["test-mixed:S:FAST"])
        assertFalse(persisted.containsKey("test-mixed:N"))
        assertFalse(persisted.containsKey("test-mixed:S"))
    }

    // ─── formatNextWindow ───────────────────────────────────────────────────────
    // today = 2026-12-15, demain = 2026-12-16

    @Test
    fun `formatNextWindow - null - aucune fenetre cette semaine`() {
        assertEquals("aucune fenêtre cette semaine", formatNextWindow(null, winterDay))
    }

    @Test
    fun `formatNextWindow - aujourd'hui`() {
        assertEquals(
            "grimpable aujourd'hui !",
            formatNextWindow(GoodWindow("2026-12-15", 10, 18), winterDay),
        )
    }

    @Test
    fun `formatNextWindow - demain`() {
        assertEquals(
            "grimpable demain",
            formatNextWindow(GoodWindow("2026-12-16", 9, 17), winterDay),
        )
    }

    @Test
    fun `formatNextWindow - dans 3 jours (weekday)`() {
        // 2026-12-18 = vendredi
        val result = formatNextWindow(GoodWindow("2026-12-18", 10, 18), winterDay)
        assertTrue(result, Regex("^dans 3 jours \\(.+\\)$").matches(result))
    }

    @Test
    fun `formatNextWindow - dans 7 jours (weekday) en limite de fenetre`() {
        val result = formatNextWindow(GoodWindow("2026-12-22", 10, 18), winterDay)
        assertTrue(result, Regex("^dans 7 jours \\(.+\\)$").matches(result))
    }

    // ─── buildDigestLines ───────────────────────────────────────────────────────

    private val alwaysBad: Summarizer = { _, _, _, _ -> badSummary }

    @Test
    fun `digest - tableau vide si aucun secteur present dans la map forecasts`() {
        val lines = buildDigestLines(listOf(sectorSingle), emptyMap(), alwaysBad, winterDay)
        assertTrue(lines.isEmpty())
    }

    @Test
    fun `digest - une ligne par secteur present dans la map`() {
        val lines = buildDigestLines(
            listOf(sectorSingle), mapOf("test-single" to emptyForecast), alwaysBad, winterDay,
        )
        assertEquals(1, lines.size)
        assertTrue(lines[0].contains("Falaise Test"))
        assertTrue(lines[0].contains("Face Sud"))
    }

    @Test
    fun `digest - aucune fenetre cette semaine si nextGoodWindow null`() {
        val lines = buildDigestLines(
            listOf(sectorSingle), mapOf("test-single" to emptyForecast), alwaysBad, winterDay,
        )
        assertTrue(lines[0].contains("aucune fenêtre cette semaine"))
    }

    @Test
    fun `digest - choisit l'orientation avec le meilleur score numerique`() {
        val summarize: Summarizer = { _, orientation, _, _ ->
            if (orientation == Orientation.W) goodSummary() else badSummary
        }
        val lines = buildDigestLines(
            listOf(sectorMulti), mapOf("test-multi" to emptyForecast), summarize, winterDay,
        )
        assertTrue(lines[0].contains("Ouest"))
        assertFalse(lines[0].contains("Sud"))
    }

    @Test
    fun `digest - saute un secteur absent de la map forecasts`() {
        val lines = buildDigestLines(
            listOf(sectorSingle, sectorMulti), mapOf("test-single" to emptyForecast), alwaysBad, winterDay,
        )
        assertEquals(1, lines.size)
        assertTrue(lines[0].contains("Falaise Test"))
    }

    @Test
    fun `digest - grimpable dans son ensemble quand toutes les faces d'un multi sont good`() {
        // winterDay = 2026-12-15 → fenêtre le 2026-12-16 = demain
        val summarize: Summarizer = { _, _, _, _ -> goodSummary("2026-12-16") }
        val lines = buildDigestLines(
            listOf(sectorMulti), mapOf("test-multi" to emptyForecast), summarize, winterDay,
        )
        assertTrue(lines[0].contains("grimpable dans son ensemble"))
        assertTrue(lines[0].contains("dès demain"))
        assertFalse(lines[0].contains("Face"))
    }

    @Test
    fun `digest - pas de dans son ensemble pour un mono-face bi-roche, meme good`() {
        val sectorBiRock = Sector(
            id = "test-birock", name = "Falaise Bi-roche", latitude = 44.0, longitude = 5.0,
            subSectors = listOf(
                SubSector("br1", "Pilier", Orientation.N, RockType.FAST),
                SubSector("br2", "Grand Mur", Orientation.N, RockType.SLOW),
            ),
        )
        val summarize: Summarizer = { _, _, _, _ -> goodSummary("2026-12-16") }
        val lines = buildDigestLines(
            listOf(sectorBiRock), mapOf("test-birock" to emptyForecast), summarize, winterDay,
        )
        assertFalse(lines[0].contains("dans son ensemble"))
        assertTrue(lines[0].contains("Face Nord"))
    }

    @Test
    fun `digest - pas de dans son ensemble pour un secteur mono-face, meme good`() {
        val summarize: Summarizer = { _, _, _, _ -> goodSummary("2026-12-16") }
        val lines = buildDigestLines(
            listOf(sectorSingle), mapOf("test-single" to emptyForecast), summarize, winterDay,
        )
        assertFalse(lines[0].contains("dans son ensemble"))
        assertTrue(lines[0].contains("Face Sud"))
    }

    // ─── sendDailyDigest — gardes d'entrée ──────────────────────────────────────

    @Test
    fun `digest - ne notifie pas si notificationsEnabled=false`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.settingsRepo.setNotificationsEnabled(false)
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `digest - ne notifie pas si digestEnabled=false`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.settingsRepo.setDigestEnabled(false)
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `digest - ne notifie pas si favoriteIds est vide`() = runTest {
        val h = Harness(this)
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `digest - ne notifie pas si lastDigestSummary identique au contenu actuel`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setLastDigestSummary("Falaise de Buoux — Face Sud : aucune fenêtre cette semaine")
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `digest - notifie si lastDigestSummary est different du contenu actuel`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setLastDigestSummary("ancien contenu")
        h.build().sendDailyDigest()
        assertEquals(1, h.notifier.displayed.size)
    }

    @Test
    fun `digest - stableKey null (ID fixe, remplace le resume du jour precedent)`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertEquals(null, h.notifier.displayed[0].stableKey)
    }

    @Test
    fun `digest - tir enregistre au journal de fiabilite (lastDigestFiredAtMs)`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertNotNull(h.notificationRepo.lastDigestFiredAtMs.first())
    }

    @Test
    fun `digest - garde anti-doublon - rien au journal de fiabilite`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setLastDigestDate("2026-12-15") // = today du harnais
        h.build().sendDailyDigest()
        assertNull(h.notificationRepo.lastDigestFiredAtMs.first())
    }

    @Test
    fun `digest - ne notifie pas si lastDigestDate correspond a aujourd'hui`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setLastDigestDate("2026-12-15")
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed.isEmpty())
    }

    @Test
    fun `digest - force=true bypasse lastDigestSummary et lastDigestDate`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.notificationRepo.setLastDigestSummary("Falaise de Buoux — Face Sud : aucune fenêtre cette semaine")
        h.notificationRepo.setLastDigestDate("2026-12-15")
        h.build().sendDailyDigest(force = true)
        assertEquals(1, h.notifier.displayed.size)
    }

    @Test
    fun `digest - ne notifie pas si tous les fetches echouent (aucune ligne)`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.fetch = { _, _ -> throw IOException("réseau") }
        h.build().sendDailyDigest() // pas de crash
        assertTrue(h.notifier.displayed.isEmpty())
    }

    // ─── sendDailyDigest — envoi nominal ────────────────────────────────────────

    @Test
    fun `digest - envoie exactement une notification groupee`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertEquals(1, h.notifier.displayed.size)
    }

    @Test
    fun `digest - le titre contient Resume grimpe`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed[0].title.startsWith("Résumé grimpe"))
    }

    @Test
    fun `digest - utilise le style BigText`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed[0].bigText)
    }

    @Test
    fun `digest - met a jour lastDigestDate apres l'envoi`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertEquals("2026-12-15", h.notificationRepo.lastDigestDate.first())
    }

    @Test
    fun `digest - met a jour lastDigestSummary apres l'envoi`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertEquals(
            "Falaise de Buoux — Face Sud : aucune fenêtre cette semaine",
            h.notificationRepo.lastDigestSummary.first(),
        )
    }

    @Test
    fun `digest - le corps mentionne le secteur favori`() = runTest {
        val h = Harness(this).apply { setupDefaults() }
        h.build().sendDailyDigest()
        assertTrue(h.notifier.displayed[0].body.contains("Falaise de Buoux"))
    }

    // ─── DigestScheduler ────────────────────────────────────────────────────────

    private fun TestScope.newSettingsRepo(): SettingsRepository {
        var n = 0
        return SettingsRepository(
            PreferenceDataStoreFactory.create(
                scope = backgroundScope,
                produceFile = { tmp.newFile("sched-${n++}.preferences_pb") },
            ),
        )
    }

    @Test
    fun `scheduler - planifie avec un delai positif`() = runTest {
        val repo = newSettingsRepo()
        val delays = mutableListOf<Long>()
        val now = java.time.ZonedDateTime.of(2026, 12, 15, 11, 0, 0, 0, com.almostblue.domain.PARIS_ZONE)
        DigestScheduler(repo, scheduleExact = { delays.add(it) }, now = { now }).scheduleNext()
        assertEquals(1, delays.size)
        assertTrue(delays[0] > 0)
        // digestHour par défaut = 10, déjà passé à 11h → demain 10h = dans 23h
        assertEquals(23L * 3600 * 1000, delays[0])
    }

    @Test
    fun `scheduler - ne planifie rien si notificationsEnabled=false`() = runTest {
        val repo = newSettingsRepo()
        repo.setNotificationsEnabled(false)
        val delays = mutableListOf<Long>()
        DigestScheduler(repo, scheduleExact = { delays.add(it) }).scheduleNext()
        assertTrue(delays.isEmpty())
    }

    @Test
    fun `scheduler - ne planifie rien si digestEnabled=false`() = runTest {
        val repo = newSettingsRepo()
        repo.setDigestEnabled(false)
        val delays = mutableListOf<Long>()
        DigestScheduler(repo, scheduleExact = { delays.add(it) }).scheduleNext()
        assertTrue(delays.isEmpty())
    }

    @Test
    fun `scheduler - meme heure pile - repousse a demain`() = runTest {
        val repo = newSettingsRepo()
        repo.setDigestHour(11)
        val delays = mutableListOf<Long>()
        val now = java.time.ZonedDateTime.of(2026, 12, 15, 11, 0, 0, 0, com.almostblue.domain.PARIS_ZONE)
        DigestScheduler(repo, scheduleExact = { delays.add(it) }, now = { now }).scheduleNext()
        // next <= now → +1 jour (parité TS)
        assertEquals(24L * 3600 * 1000, delays[0])
    }
}
