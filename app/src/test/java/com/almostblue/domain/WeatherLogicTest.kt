package com.almostblue.domain

import com.almostblue.data.OpenMeteoHourly
import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Port 1:1 de spec/__tests__/utils/weatherLogic.test.ts (50 tests), complété
 * depuis par les tests des bonus « conditions excellentes » (divergence v2.x).
 *
 * Contexte temporel figé (équivalent des fake timers Jest) :
 *   now    = 2026-06-15T10:00:00Z  (= Paris 12h00, été UTC+2)
 *   cutoff = 2026-06-18T10:00:00Z  (72h après now)
 *
 * Tous les slots utilisent des heures en "Paris local" (timezone de l'API).
 * Exemples clés :
 *   Paris 11h le 15/06 = UTC  9h → PASSÉ (< now)      → exclu du résumé
 *   Paris 14h le 15/06 = UTC 12h → FUTUR (> now)      → inclus
 *   Paris 14h le 17/06 = UTC 12h → FUTUR & < cutoff   → inclus
 *   Paris 14h le 18/06 = UTC 12h → > cutoff           → exclu
 */

private val FIXED_NOW: Long = Instant.parse("2026-06-15T10:00:00Z").toEpochMilli()

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Données brutes Open-Meteo neutres sur 3 jours (72 h, Paris local time). */
private fun makeHourly(
    temperature2m: List<Double>? = null,
    windspeed10m: List<Double>? = null,
    winddirection10m: List<Double>? = List(72) { 0.0 },
    precipitation: List<Double>? = null,
    precipitationProbability: List<Double>? = List(72) { 0.0 },
    weathercode: List<Int>? = null,
): OpenMeteoHourly {
    val time = buildList {
        for (day in 15..17) {
            for (h in 0 until 24) {
                add("2026-06-%02dT%02d:00".format(day, h))
            }
        }
    }
    // Indices utiles (heure Paris) :
    //  [0] = 15/06 00h  [14] = 15/06 14h  [38] = 16/06 14h  [62] = 17/06 14h

    return OpenMeteoHourly(
        time = time,
        temperature2m = temperature2m ?: List(72) { 15.0 },
        windspeed10m = windspeed10m ?: List(72) { 0.0 },
        winddirection10m = winddirection10m,
        precipitation = precipitation ?: List(72) { 0.0 },
        precipitationProbability = precipitationProbability,
        weathercode = weathercode ?: List(72) { 0 },
    )
}

/** Crée un WeatherSlot aux valeurs neutres (bon temps, 15°C, pas de pluie). */
private fun makeSlot(
    date: String,
    hour: Int,
    temperature: Double = 15.0,
    windspeed: Double = 0.0,
    windDirection: Double = 0.0,
    precipitation: Double = 0.0,
    precipProbability: Double = 0.0,
    weatherCode: Int = 0,
    recentRainMm6h: Double = 0.0,
    recentRainMm24h: Double = 0.0,
) = WeatherSlot(
    date = date,
    hour = hour,
    score = WeatherScore.GOOD,
    numericScore = 6.5,
    temperature = temperature,
    windspeed = windspeed,
    windDirection = windDirection,
    precipitation = precipitation,
    precipProbability = precipProbability,
    weatherCode = weatherCode,
    recentRainMm6h = recentRainMm6h,
    recentRainMm24h = recentRainMm24h,
)

private fun makeForecast(slots: List<WeatherSlot>) =
    WeatherForecast(slots = slots, source = "open-meteo", fetchedAt = Instant.now().toString())

/** Raccourci : getSubSectorSummary avec l'horloge figée des tests. */
private fun summarize(
    forecast: WeatherForecast,
    orientation: Orientation,
    rockType: RockType = RockType.SLOW,
    horizonHours: Int = 72,
) = getSubSectorSummary(forecast, orientation, rockType, horizonHours, nowMs = FIXED_NOW)

// ─── buildForecast ────────────────────────────────────────────────────────────

class BuildForecastTest {

    @Test
    fun `slot neutre (15degC, pas de pluie, code 0) - score good`() {
        val forecast = buildForecast(makeHourly())
        assertEquals(WeatherScore.GOOD, forecast.slots[0].score)
    }

    @Test
    fun `slot neutre - numericScore superieur ou egal a 6`() {
        val forecast = buildForecast(makeHourly())
        assertTrue(forecast.slots[0].numericScore >= 6.0)
    }

    @Test
    fun `precipitation active (1 mm par h) - score bad`() {
        val precipitation = MutableList(72) { 0.0 }.also { it[0] = 1.0 }
        val forecast = buildForecast(makeHourly(precipitation = precipitation))
        assertEquals(WeatherScore.BAD, forecast.slots[0].score)
    }

    @Test
    fun `code WMO orage (95) - score bad, numericScore proche de 0`() {
        val weathercode = MutableList(72) { 0 }.also { it[0] = 95 }
        val forecast = buildForecast(makeHourly(weathercode = weathercode))
        assertEquals(WeatherScore.BAD, forecast.slots[0].score)
        assertTrue(forecast.slots[0].numericScore < 2.0)
    }

    @Test
    fun `code WMO neige forte (75) - score bad`() {
        val weathercode = MutableList(72) { 0 }.also { it[0] = 75 }
        val forecast = buildForecast(makeHourly(weathercode = weathercode))
        assertEquals(WeatherScore.BAD, forecast.slots[0].score)
    }

    @Test
    fun `probabilite de pluie 70 pct ou plus - score bad`() {
        val prob = MutableList(72) { 0.0 }.also { it[0] = 75.0 }
        val forecast = buildForecast(makeHourly(precipitationProbability = prob))
        assertEquals(WeatherScore.BAD, forecast.slots[0].score)
    }

    @Test
    fun `probabilite de pluie entre 40 et 69 pct - score ok`() {
        val prob = MutableList(72) { 0.0 }.also { it[0] = 45.0 }
        val forecast = buildForecast(makeHourly(precipitationProbability = prob))
        assertEquals(WeatherScore.OK, forecast.slots[0].score)
    }

    @Test
    fun `probabilite de pluie sous 40 pct - score good`() {
        val prob = MutableList(72) { 0.0 }.also { it[0] = 35.0 }
        val forecast = buildForecast(makeHourly(precipitationProbability = prob))
        assertEquals(WeatherScore.GOOD, forecast.slots[0].score)
    }

    @Test
    fun `froid sec modere (3degC) - score good (le froid ne penalise plus)`() {
        val forecast = buildForecast(makeHourly(temperature2m = List(72) { 3.0 }))
        assertEquals(WeatherScore.GOOD, forecast.slots[0].score)
    }

    @Test
    fun `temperature proche de 0degC - score ok (penalite froid residuelle)`() {
        val forecast = buildForecast(makeHourly(temperature2m = List(72) { 0.0 }))
        assertEquals(WeatherScore.OK, forecast.slots[0].score)
    }

    @Test
    fun `pluie recente (dans les 6h precedentes) - recentRainMm6h positif, score ok`() {
        val precipitation = MutableList(72) { 0.0 }.also { it[5] = 1.0 }
        val forecast = buildForecast(makeHourly(precipitation = precipitation))

        assertEquals(WeatherScore.BAD, forecast.slots[5].score) // pluie active sur ce slot
        assertTrue(forecast.slots[6].recentRainMm6h > 0.0)
        assertEquals(WeatherScore.OK, forecast.slots[6].score) // pluie récente → ok
    }

    @Test
    fun `pluie recente hors de la fenetre de 6h - recentRainMm6h nul, score good`() {
        val precipitation = MutableList(72) { 0.0 }.also { it[0] = 1.0 }
        val forecast = buildForecast(makeHourly(precipitation = precipitation))

        assertEquals(0.0, forecast.slots[13].recentRainMm6h, 1e-9)
        assertEquals(WeatherScore.GOOD, forecast.slots[13].score)
    }

    @Test
    fun `extrait correctement date et heure depuis la string de temps`() {
        val forecast = buildForecast(makeHourly())
        assertEquals("2026-06-15", forecast.slots[14].date)
        assertEquals(14, forecast.slots[14].hour)
        assertEquals("2026-06-16", forecast.slots[38].date)
        assertEquals(14, forecast.slots[38].hour)
    }

    @Test
    fun `champs optionnels absents - valeur par defaut 0`() {
        val hourly = makeHourly(winddirection10m = null, precipitationProbability = null)
        val forecast = buildForecast(hourly)
        assertEquals(0.0, forecast.slots[0].windDirection, 1e-9)
        assertEquals(0.0, forecast.slots[0].precipProbability, 1e-9)
    }

    @Test
    fun `numericScore toujours dans 0 a 10`() {
        val forecast = buildForecast(makeHourly(weathercode = List(72) { 95 })) // orages partout
        for (slot in forecast.slots) {
            assertTrue(slot.numericScore >= 0.0)
            assertTrue(slot.numericScore <= 10.0)
        }
    }
}

// ─── getSubSectorSummary ──────────────────────────────────────────────────────

class GetSubSectorSummaryTest {

    // ── Cas limites ─────────────────────────────────────────────────────────────

    @Test
    fun `forecast vide - score bad, numericScore 0, nextGoodWindow null`() {
        val summary = summarize(makeForecast(emptyList()), Orientation.S)
        assertEquals(WeatherScore.BAD, summary.score)
        assertEquals(0.0, summary.numericScore, 1e-9)
        assertNull(summary.nextGoodWindow)
    }

    @Test
    fun `tous les slots dans le passe - score bad`() {
        // Paris 11h le 15/06 = UTC 9h < now (UTC 10h) → passé
        val slots = listOf(makeSlot("2026-06-15", 11))
        assertEquals(WeatherScore.BAD, summarize(makeForecast(slots), Orientation.S).score)
    }

    @Test
    fun `slots hors fenetre horaire (nuit 6h, 21h) - filtres`() {
        val slots = listOf(
            makeSlot("2026-06-16", 6),  // trop tôt (< 7h)
            makeSlot("2026-06-16", 21), // trop tard (> 20h)
        )
        assertEquals(WeatherScore.BAD, summarize(makeForecast(slots), Orientation.S).score)
    }

    @Test
    fun `tous les slots apres le cutoff de 72h - score bad`() {
        // Paris 14h le 18/06 = UTC 12h > cutoff (2026-06-18T10:00Z)
        val slots = listOf(makeSlot("2026-06-18", 14))
        assertEquals(WeatherScore.BAD, summarize(makeForecast(slots), Orientation.S).score)
    }

    @Test
    fun `slot a 72h pile (Paris 14h le 17-06 = UTC 12h) - inclus dans la fenetre`() {
        val slots = listOf(makeSlot("2026-06-17", 14))
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.S).score)
    }

    // ── Score global ────────────────────────────────────────────────────────────

    @Test
    fun `un slot good dans la fenetre - overallScore good`() {
        val slots = listOf(makeSlot("2026-06-16", 14))
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.S).score)
    }

    @Test
    fun `numericScore reflete le meilleur slot de la fenetre`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14),                       // conditions neutres → numericScore ~6.5
            makeSlot("2026-06-16", 15, precipitation = 1.0),  // mauvais
        )
        assertTrue(summarize(makeForecast(slots), Orientation.S).numericScore >= 6.0)
    }

    @Test
    fun `slots tous mauvais - overallScore bad`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14, precipitation = 1.0),
            makeSlot("2026-06-16", 15, precipitation = 1.0),
        )
        assertEquals(WeatherScore.BAD, summarize(makeForecast(slots), Orientation.S).score)
    }

    @Test
    fun `mix ok et bad sans good - overallScore ok`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14, precipProbability = 65.0), // ok
            makeSlot("2026-06-16", 15, precipitation = 1.0),      // bad
        )
        assertEquals(WeatherScore.OK, summarize(makeForecast(slots), Orientation.S).score)
    }

    // ── Score numérique ─────────────────────────────────────────────────────────

    @Test
    fun `orage - numericScore sous 2`() {
        val slots = listOf(makeSlot("2026-06-16", 14, weatherCode = 95))
        assertTrue(summarize(makeForecast(slots), Orientation.S).numericScore < 2.0)
    }

    @Test
    fun `meteo ideale (ciel degage, vent sechant de face) - numericScore au-dela de 7`() {
        val slots = listOf(
            makeSlot(
                "2026-06-16", 14,
                weatherCode = 0,        // ciel dégagé
                windDirection = 180.0,  // face S, vent du Sud = vent de face
                windspeed = 20.0,       // vent fort → séchage actif
            ),
        )
        val summary = summarize(makeForecast(slots), Orientation.S, RockType.FAST)
        assertTrue(summary.numericScore > 7.0)
    }

    @Test
    fun `numericScore toujours dans 0 a 10`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14, weatherCode = 95, precipitation = 5.0), // pire cas
        )
        val summary = summarize(makeForecast(slots), Orientation.N)
        assertTrue(summary.numericScore >= 0.0)
        assertTrue(summary.numericScore <= 10.0)
    }

    // ── Fenêtre good (nextGoodWindow) ───────────────────────────────────────────

    @Test
    fun `aucun creneau good - nextGoodWindow null`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14, precipProbability = 65.0), // ok seulement
        )
        assertNull(summarize(makeForecast(slots), Orientation.S).nextGoodWindow)
    }

    @Test
    fun `fenetre good detectee - date et startHour corrects`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14),
            makeSlot("2026-06-16", 15),
            makeSlot("2026-06-16", 16),
        )
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals("2026-06-16", summary.nextGoodWindow?.date)
        assertEquals(14, summary.nextGoodWindow?.startHour)
    }

    /**
     * TEST DE RÉGRESSION : endHour doit être last.hour + 1.
     * Un créneau à 16h couvre 16h00–17h00, donc la fenêtre se termine à 17h.
     */
    @Test
    fun `regression endHour plus 1 - dernier creneau a 16h - endHour 17`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14),
            makeSlot("2026-06-16", 15),
            makeSlot("2026-06-16", 16),
        )
        assertEquals(17, summarize(makeForecast(slots), Orientation.S).nextGoodWindow?.endHour)
    }

    @Test
    fun `fenetre good suivie d'un bad - la bonne fenetre est capturee`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14),
            makeSlot("2026-06-16", 15),
            makeSlot("2026-06-16", 16, precipitation = 1.0), // bad → clôt la fenêtre
            makeSlot("2026-06-16", 17),                      // good (2ème fenêtre, ignorée)
        )
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals(14, summary.nextGoodWindow?.startHour)
        assertEquals(16, summary.nextGoodWindow?.endHour) // 15 + 1
    }

    /**
     * TEST DE RÉGRESSION : la fenêtre ne doit pas enjamber la nuit.
     * Le filtre 7h–20h rend adjacents le créneau de 20h et celui de 7h du
     * lendemain ; l'ancienne logique fusionnait soirée + matinée en une seule
     * fenêtre absurde (« 18h–10h »). La fenêtre doit se fermer à 21h.
     */
    @Test
    fun `regression nuit - good le soir + good le lendemain matin - la premiere fenetre est retournee`() {
        val slots = listOf(
            makeSlot("2026-06-16", 19),
            makeSlot("2026-06-16", 20),
            makeSlot("2026-06-17", 7),                      // good mais après la nuit
            makeSlot("2026-06-17", 8),
            makeSlot("2026-06-17", 9, precipitation = 1.0), // bad
        )
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals("2026-06-16", summary.nextGoodWindow?.date)
        assertEquals(19, summary.nextGoodWindow?.startHour)
        assertEquals(21, summary.nextGoodWindow?.endHour) // 20 + 1, pas 9 !
    }

    @Test
    fun `regression nuit - un trou horaire intra-journee clot aussi la fenetre`() {
        val slots = listOf(
            makeSlot("2026-06-16", 14),
            makeSlot("2026-06-16", 15),
            makeSlot("2026-06-16", 18), // good mais non contigu (16h–17h absents)
        )
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals(14, summary.nextGoodWindow?.startHour)
        assertEquals(16, summary.nextGoodWindow?.endHour) // 15 + 1
    }

    // ── Correctifs d'orientation (température) ──────────────────────────────────

    // Seuil de base MIN_TEMP = 2°C, pénalité douce (0.5/°C) : le froid sec ne mord
    // que près de 0°C. Le correctif d'orientation relève/abaisse ce seuil.

    @Test
    fun `face N (adjust +4degC) - 4degC sous seuil effectif (6degC) - ok`() {
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 4.0))
        assertEquals(WeatherScore.OK, summarize(makeForecast(slots), Orientation.N).score)
    }

    @Test
    fun `face N (adjust +4degC) - 7degC au-dela du seuil effectif (6degC) - good`() {
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 7.0))
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.N).score)
    }

    @Test
    fun `face S (adjust -2degC) - 7degC au-dela du seuil effectif (0degC) - good`() {
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 7.0))
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.S).score)
    }

    @Test
    fun `face NE (adjust +3degC) - 3degC sous seuil effectif (5degC) - ok`() {
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 3.0))
        assertEquals(WeatherScore.OK, summarize(makeForecast(slots), Orientation.NE).score)
    }

    @Test
    fun `face E (adjust 0degC) - 6degC au-dela du seuil (2degC) - good`() {
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 6.0))
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.E).score)
    }

    @Test
    fun `face E - 0degC sous le seuil (2degC) - ok`() {
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 0.0))
        assertEquals(WeatherScore.OK, summarize(makeForecast(slots), Orientation.E).score)
    }

    // ── Pluie récente × exposition au vent ──────────────────────────────────────

    @Test
    fun `pluie recente + vent de face fort - sechage actif - good`() {
        // Face S (wallDeg = 180°), vent venant du Sud (windDir = 180°)
        // diff = 0 ≤ 60 → exposed, windspeed = 20 ≥ 15 → EXPOSURE_EXPOSED_STRONG = 0
        val slots = listOf(
            makeSlot("2026-06-16", 14, recentRainMm6h = 2.0, windDirection = 180.0, windspeed = 20.0),
        )
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.S, RockType.FAST).score)
    }

    @Test
    fun `pluie recente legere + roche rapide - seche assez - good`() {
        // Coef fast doux (−0.5/mm) : 2 mm avec un léger vent de face → reste good.
        val slots = listOf(
            makeSlot("2026-06-16", 14, recentRainMm6h = 2.0, windDirection = 180.0, windspeed = 10.0),
        )
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.S, RockType.FAST).score)
    }

    @Test
    fun `pluie recente + roche lente (slow) - prudent - bad`() {
        // Contraste avec le cas fast : coef slow sévère (−1.5/mm) sur la fenêtre 24h.
        val slots = listOf(
            makeSlot("2026-06-16", 14, recentRainMm24h = 3.0, windDirection = 0.0, windspeed = 0.0),
        )
        assertEquals(WeatherScore.BAD, summarize(makeForecast(slots), Orientation.S, RockType.SLOW).score)
    }

    @Test
    fun `pluie recente + vent de dos - sechage tres lent - ok`() {
        // Face S (wallDeg = 180°), vent du Nord (windDir = 0°) → sheltered
        val slots = listOf(
            makeSlot("2026-06-16", 14, recentRainMm6h = 2.0, windDirection = 0.0, windspeed = 20.0),
        )
        assertEquals(WeatherScore.OK, summarize(makeForecast(slots), Orientation.S, RockType.FAST).score)
    }

    @Test
    fun `pluie recente + vent de cote - sechage modere - ok`() {
        // Face S (wallDeg = 180°), vent de l'Est (windDir = 90°) → side
        val slots = listOf(
            makeSlot("2026-06-16", 14, recentRainMm6h = 2.0, windDirection = 90.0, windspeed = 20.0),
        )
        assertEquals(WeatherScore.OK, summarize(makeForecast(slots), Orientation.S, RockType.FAST).score)
    }

    @Test
    fun `roche lente (slow) utilise recentRainMm24h`() {
        // Pluie significative en 24h mais pas en 6h → pénalité pour roche lente
        val slot = makeSlot("2026-06-16", 14, recentRainMm6h = 0.0, recentRainMm24h = 5.0)
        val summaryFast = summarize(makeForecast(listOf(slot)), Orientation.S, RockType.FAST)
        val summarySlow = summarize(makeForecast(listOf(slot)), Orientation.S, RockType.SLOW)
        // Roche rapide ignore 24h → pas de pénalité → meilleur score
        assertTrue(summaryFast.numericScore > summarySlow.numericScore)
    }

    // ── Bonus « conditions excellentes » ────────────────────────────────────────

    @Test
    fun `canicule - clair, sec, 38degC, vent nul - score 8,5 exactement`() {
        // BASE 6 + clair 0.5 + sécheresse 2.0 = 8.5 (38°C hors bande de friction)
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 38.0))
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals(8.5, summary.numericScore, 1e-9)
        assertEquals(WeatherScore.GOOD, summary.score)
    }

    @Test
    fun `plafond sans vent - clair, sec, temp ideale, vent nul - score 10`() {
        // Le 10 ne doit pas dépendre du vent séchant (facteur subi) :
        // BASE 6 + clair 0.5 + sécheresse 2.0 + temp idéale 1.5 = 10.0 pile
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 12.0))
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals(10.0, summary.numericScore, 1e-9)
    }

    @Test
    fun `journee parfaite avec vent sechant de face - le clamp sature a 10`() {
        // 6 + 0.5 + 2.0 + 1.5 + vent séchant 1.0 = 11 → clampé à 10.0
        val slots = listOf(
            makeSlot(
                "2026-06-16", 14,
                temperature = 12.0,
                windDirection = 180.0, // vent du Sud, face S → exposed
                windspeed = 20.0,      // ≥ MIN_WIND_DRYING
            ),
        )
        val summary = summarize(makeForecast(slots), Orientation.S, RockType.FAST)
        assertEquals(10.0, summary.numericScore, 1e-9)
    }

    @Test
    fun `gating - proba de pluie 45 pct annule les bonus d'excellence`() {
        // Malus warn −2 déclenché → créneau pas propre → 6 + 0.5 − 2 = 4.5
        val slots = listOf(makeSlot("2026-06-16", 14, precipProbability = 45.0))
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals(4.5, summary.numericScore, 1e-9)
    }

    @Test
    fun `gating - orage sec (WMO 95, 0 mm) ne prend aucun bonus`() {
        // Sans gating, sécheresse + temp idéale (+2.5) remonteraient l'orage à 2.5
        val slots = listOf(makeSlot("2026-06-16", 14, weatherCode = 95))
        assertTrue(summarize(makeForecast(slots), Orientation.S).numericScore < 2.0)
    }

    @Test
    fun `gating - pluie recente annule aussi le bonus temperature ideale`() {
        // 2 mm / 6h fast, vent de côté (side ×0.75) : malus −0.75, pas de bonus
        // 6 + 0.5 − 0.75 = 5.75 → OK (et pas GOOD via +1 de temp idéale)
        val slots = listOf(
            makeSlot("2026-06-16", 14, recentRainMm6h = 2.0, windDirection = 90.0, windspeed = 20.0),
        )
        val summary = summarize(makeForecast(slots), Orientation.S, RockType.FAST)
        assertEquals(5.75, summary.numericScore, 1e-9)
    }

    @Test
    fun `bande de friction decalee par l'orientation - 20degC bonus en N, pas en S`() {
        // Face N : bande [9, 22] → 20°C dedans (10.0) ; face S : [3, 16] → dehors (8.5)
        val slots = listOf(makeSlot("2026-06-16", 14, temperature = 20.0))
        val summaryN = summarize(makeForecast(slots), Orientation.N)
        val summaryS = summarize(makeForecast(slots), Orientation.S)
        assertEquals(10.0, summaryN.numericScore, 1e-9)
        assertEquals(8.5, summaryS.numericScore, 1e-9)
    }

    // ── TEST DE RÉGRESSION : timezone ───────────────────────────────────────────

    /**
     * Sans parisLocalToUTC(), un device en UTC interprète "2026-06-15T11:00"
     * comme UTC 11h (futur), l'incluant à tort dans la fenêtre.
     * Après le fix, Paris 11h = UTC 9h → PASSÉ → exclu.
     */
    @Test
    fun `regression timezone - slot Paris 11h (UTC 9h) considere comme passe`() {
        val slots = listOf(makeSlot("2026-06-15", 11))
        val summary = summarize(makeForecast(slots), Orientation.S)
        assertEquals(WeatherScore.BAD, summary.score)
        assertNull(summary.nextGoodWindow)
    }

    @Test
    fun `regression timezone - slot Paris 14h (UTC 12h) considere comme futur`() {
        val slots = listOf(makeSlot("2026-06-15", 14))
        assertEquals(WeatherScore.GOOD, summarize(makeForecast(slots), Orientation.S).score)
    }

    // now = 2026-06-15T10:00Z → cutoff 72h = 2026-06-18T10:00Z, cutoff 168h = 2026-06-22T10:00Z
    // Paris 14h le 19/06 = UTC 12h → hors 72h mais dans 168h
    @Test
    fun `horizonHours 168 inclut un slot a J+4 exclu en 72h`() {
        val forecast = makeForecast(listOf(makeSlot("2026-06-19", 14)))
        assertEquals(WeatherScore.BAD, summarize(forecast, Orientation.S, RockType.SLOW, 72).score)
        assertEquals(WeatherScore.GOOD, summarize(forecast, Orientation.S, RockType.SLOW, 168).score)
    }
}
