package com.almostblue.notifications

import com.almostblue.data.NotificationRepository
import com.almostblue.data.Sector
import com.almostblue.data.SectorsRepository
import com.almostblue.data.SettingsRepository
import com.almostblue.data.sectors as allSectorsDefault
import com.almostblue.domain.Orientation
import com.almostblue.domain.PARIS_ZONE
import com.almostblue.domain.RockType
import com.almostblue.domain.WeatherForecast
import com.almostblue.domain.WeatherScore
import com.almostblue.domain.isOffSeason
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.flow.first

/**
 * Logique de notifications météo — port de checkAndNotify() et sendDailyDigest()
 * de spec/src/services/notificationService.ts.
 *
 * Flux :
 *  1. checkAndNotify() est appelé par le CheckWorker (WorkManager).
 *  2. Pour chaque secteur favori, on calcule le meilleur score par (orientation, roche).
 *  3. Si un score passe de !good → good par rapport au dernier check → notif.
 *  4. Les nouveaux scores sont persistés dans NotificationRepository.
 */

data class AppNotification(
    val title: String,
    val body: String,
    /** true pour le digest (style BigText Android). */
    val bigText: Boolean = false,
)

/** Frontière vers NotificationManager — implémentée par AndroidNotifier, fake en test. */
interface Notifier {
    fun display(notification: AppNotification)
}

private val DIGEST_DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM")

class WeatherNotifier(
    private val settingsRepo: SettingsRepository,
    private val sectorsRepo: SectorsRepository,
    private val notificationRepo: NotificationRepository,
    private val fetchForecast: suspend (latitude: Double, longitude: Double) -> WeatherForecast,
    private val notifier: Notifier,
    private val summarize: Summarizer = defaultSummarizer,
    private val allSectors: List<Sector> = allSectorsDefault,
    private val today: () -> LocalDate = { LocalDate.now(PARIS_ZONE) },
) {

    /**
     * Point d'entrée du check périodique.
     * Compare les scores actuels aux derniers scores connus et envoie des notifs
     * pour les transitions !good → good sur les secteurs favoris.
     */
    suspend fun checkAndNotify(force: Boolean = false) {
        val settings = settingsRepo.settings.first()

        if (!force && !settings.notificationsEnabled) return

        // Respecter la saisonnalité : pas de notifs en été sauf si activé ou forcé
        val offSeason = isOffSeason(today(), settings.offseasonStart, settings.offseasonEnd)
        if (!force && !offSeason && !settings.notificationsInSummer) return

        val favoriteIds = sectorsRepo.favoriteIds.first()
        if (favoriteIds.isEmpty()) return

        val lastScores = notificationRepo.lastScores.first()
        val newScores = lastScores.toMutableMap()

        val favSectors = allSectors.filter { it.id in favoriteIds }

        for (sector in favSectors) {
            val forecast = try {
                fetchForecast(sector.latitude, sector.longitude)
            } catch (_: Exception) {
                continue // Erreur réseau → on skip ce secteur
            }

            // Dédupliquer par (orientation, roche) en gardant le premier
            // sous-secteur représentatif : deux roches d'une même face ne
            // sèchent pas à la même vitesse (ex. Pen-Hir N : Menhir FAST
            // vs Face nord SLOW), chacune mérite son propre suivi.
            val faceMap = LinkedHashMap<Pair<Orientation, RockType>, String>()
            for (ss in sector.subSectors) {
                faceMap.putIfAbsent(ss.orientation to ss.rockType, ss.name)
            }

            val newlyGood = mutableListOf<GoodOrientation>()

            for ((face, subSectorName) in faceMap) {
                val (orientation, rockType) = face
                val key = "${sector.id}:${orientation.name}:${rockType.name}"
                // Clé d'avant le suivi par roche — lue en repli pour ne pas
                // re-notifier tous les favoris déjà GOOD à la migration.
                val legacyKey = "${sector.id}:${orientation.name}"
                val summary = summarize(forecast, orientation, rockType, 72)
                val wasGood = (lastScores[key] ?: lastScores[legacyKey]) == WeatherScore.GOOD

                if (summary.score == WeatherScore.GOOD && !wasGood) {
                    newlyGood.add(GoodOrientation(orientation, subSectorName, summary.nextGoodWindow))
                }

                newScores[key] = summary.score
                newScores.remove(legacyKey)
            }

            if (newlyGood.isNotEmpty()) {
                val timing = formatNextWindow(getEarliestWindow(newlyGood.map { it.nextGoodWindow }), today())
                notifier.display(
                    AppNotification(
                        title = "${sector.name} — $timing",
                        body = buildNotificationBody(newlyGood, faceMap.size),
                    ),
                )
            }
        }

        notificationRepo.setScores(newScores)
    }

    /**
     * Envoie la notification de digest quotidien.
     * Gardes :
     *  - notificationsEnabled + digestEnabled (jamais bypassées)
     *  - favoriteIds non vide
     *  - contenu identique au dernier digest envoyé (pas de nouvelle info → silence)
     *  - même jour calendaire (Paris) que lastDigestDate (garde anti-doublon intra-journalier)
     * Passer force=true pour bypasser les deux gardes de dédup (bouton debug).
     */
    suspend fun sendDailyDigest(force: Boolean = false) {
        val settings = settingsRepo.settings.first()
        if (!settings.notificationsEnabled || !settings.digestEnabled) return

        val favoriteIds = sectorsRepo.favoriteIds.first()
        if (favoriteIds.isEmpty()) return

        val favSectors = allSectors.filter { it.id in favoriteIds }
        val forecasts = mutableMapOf<String, WeatherForecast>()

        for (sector in favSectors) {
            try {
                forecasts[sector.id] = fetchForecast(sector.latitude, sector.longitude)
            } catch (_: Exception) {
                // Erreur réseau → ce secteur sera absent de la map, buildDigestLines le skipera
            }
        }

        val lines = buildDigestLines(favSectors, forecasts, summarize, today())
        if (lines.isEmpty()) return

        val body = lines.joinToString("\n")
        val todayStr = today().toString() // ISO "2026-12-15", format de lastDigestDate

        if (!force && body == notificationRepo.lastDigestSummary.first()) return
        if (!force && todayStr == notificationRepo.lastDigestDate.first()) return

        notifier.display(
            AppNotification(
                title = "Résumé grimpe · ${DIGEST_DATE_FORMAT.format(today())}",
                body = body,
                bigText = true,
            ),
        )

        notificationRepo.setLastDigestSummary(body)
        notificationRepo.setLastDigestDate(todayStr)
    }
}
