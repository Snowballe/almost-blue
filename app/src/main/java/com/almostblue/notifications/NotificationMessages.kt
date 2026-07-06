package com.almostblue.notifications

import com.almostblue.data.Sector
import com.almostblue.domain.GoodWindow
import com.almostblue.domain.Orientation
import com.almostblue.domain.PARIS_ZONE
import com.almostblue.domain.RockType
import com.almostblue.domain.SubSectorSummary
import com.almostblue.domain.WeatherForecast
import com.almostblue.domain.WeatherScore
import com.almostblue.domain.frenchName
import com.almostblue.domain.getSubSectorSummary
import java.time.LocalDate
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

/**
 * Construction des messages de notification — port 1:1 de la partie pure de
 * spec/src/services/notificationService.ts. Les textes FR sont la spec.
 */

/** Signature de getSubSectorSummary, injectable dans les tests (équivalent du mock Jest). */
typealias Summarizer = (WeatherForecast, Orientation, RockType, Int) -> SubSectorSummary

val defaultSummarizer: Summarizer = { forecast, orientation, rockType, horizon ->
    getSubSectorSummary(forecast, orientation, rockType, horizon)
}

const val DIGEST_HORIZON_HOURS = 168 // 7 jours

data class GoodOrientation(
    val orientation: Orientation,
    val subSectorName: String,
    val nextGoodWindow: GoodWindow?,
)

// ── Corps du message d'alerte ─────────────────────────────────────────────────

fun buildNotificationBody(
    goodOrientations: List<GoodOrientation>,
    totalOrientations: Int,
): String {
    if (goodOrientations.size == totalOrientations) {
        return "Toutes les faces sont sèches !"
    }

    // distinct() : une même face peut apparaître deux fois (roches FAST et SLOW)
    val faces = goodOrientations.map { it.orientation.frenchName }.distinct()
    val subName = goodOrientations[0].subSectorName

    if (faces.size == 1) {
        return "La face ${faces[0]} est sèche. Allez sur $subName."
    }

    val facesStr = faces.dropLast(1).joinToString(", ") + " et " + faces.last()
    return "Les faces $facesStr sont sèches. Allez sur $subName."
}

fun getEarliestWindow(windows: List<GoodWindow?>): GoodWindow? {
    var earliest: GoodWindow? = null
    for (window in windows) {
        if (window == null) continue
        val best = earliest
        if (best == null ||
            window.date < best.date ||
            (window.date == best.date && window.startHour < best.startHour)
        ) {
            earliest = window
        }
    }
    return earliest
}

// ── Formatage des fenêtres ────────────────────────────────────────────────────

fun todayParis(): LocalDate = LocalDate.now(PARIS_ZONE)

private fun frenchWeekday(date: LocalDate): String =
    date.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.FRENCH)

/**
 * Formate la disponibilité d'une fenêtre météo favorable pour le digest.
 * Ex : "grimpable aujourd'hui !", "dans 3 jours (vendredi)", "aucune fenêtre cette semaine"
 */
fun formatNextWindow(
    nextGoodWindow: GoodWindow?,
    today: LocalDate = todayParis(),
): String {
    if (nextGoodWindow == null) {
        return "aucune fenêtre cette semaine"
    }

    val windowDate = LocalDate.parse(nextGoodWindow.date)
    if (windowDate == today) return "grimpable aujourd'hui !"
    if (windowDate == today.plusDays(1)) return "grimpable demain"

    val diffDays = ChronoUnit.DAYS.between(today, windowDate)
    return "dans $diffDays jours (${frenchWeekday(windowDate)})"
}

/**
 * Forme compacte « dès … » pour la ligne « grimpable dans son ensemble ».
 * Ex : "dès aujourd'hui", "dès demain", "dès mercredi".
 * Renvoie null en l'absence de fenêtre (défensif — ne devrait pas arriver quand
 * toutes les faces sont GOOD).
 */
fun formatEnsembleTiming(
    window: GoodWindow?,
    today: LocalDate = todayParis(),
): String? {
    if (window == null) return null

    val windowDate = LocalDate.parse(window.date)
    if (windowDate == today) return "dès aujourd'hui"
    if (windowDate == today.plusDays(1)) return "dès demain"

    return "dès ${frenchWeekday(windowDate)}"
}

// ── Lignes du digest ──────────────────────────────────────────────────────────

/**
 * Construit les lignes du digest à partir des forecasts déjà fetchés.
 * Une ligne par secteur : orientation la plus favorable sur 7 jours, ou la
 * phrase « grimpable dans son ensemble » si toutes les faces d'un secteur
 * multi-orientations sont sèches.
 */
fun buildDigestLines(
    favSectors: List<Sector>,
    forecasts: Map<String, WeatherForecast>,
    summarize: Summarizer = defaultSummarizer,
    today: LocalDate = todayParis(),
): List<String> {
    val lines = mutableListOf<String>()

    for (sector in favSectors) {
        val forecast = forecasts[sector.id] ?: continue

        // Dédupliquer par (orientation, roche) : deux roches d'une même face
        // ne sèchent pas à la même vitesse, chaque paire est scorée séparément.
        val faces = LinkedHashSet<Pair<Orientation, RockType>>()
        for (ss in sector.subSectors) {
            faces.add(ss.orientation to ss.rockType)
        }
        if (faces.isEmpty()) continue

        // Scorer chaque paire distincte, tout en gardant la meilleure pour le repli
        val summaries = mutableListOf<SubSectorSummary>()
        var bestScore = -1.0
        var bestOrientation: Orientation? = null
        var bestWindow: GoodWindow? = null

        for ((orientation, rockType) in faces) {
            val summary = summarize(forecast, orientation, rockType, DIGEST_HORIZON_HOURS)
            summaries.add(summary)
            if (summary.numericScore > bestScore) {
                bestScore = summary.numericScore
                bestOrientation = orientation
                bestWindow = summary.nextGoodWindow
            }
        }

        if (bestOrientation == null) continue

        // Secteur multi-faces entièrement sec → phrase « dans son ensemble »
        // (compté en orientations distinctes : un mono-face bi-roche n'est pas un « ensemble »)
        val distinctOrientations = faces.mapTo(HashSet()) { it.first }.size
        if (distinctOrientations >= 2 && summaries.all { it.score == WeatherScore.GOOD }) {
            val timing = formatEnsembleTiming(getEarliestWindow(summaries.map { it.nextGoodWindow }), today)
            lines.add("${sector.name} — grimpable dans son ensemble${if (timing != null) " ($timing)" else ""}")
            continue
        }

        val faceLabel = bestOrientation.frenchName
        val status = formatNextWindow(bestWindow, today)
        lines.add("${sector.name} — Face $faceLabel : $status")
    }

    return lines
}
