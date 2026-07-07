package com.almostblue.domain

import com.almostblue.data.OpenMeteoHourly
import java.time.Instant
import java.time.LocalDate

/**
 * Logique météo — modèle additif pondéré, hérité du port 1:1 de la v1.3 RN
 * (spec/src/utils/weatherLogic.ts, fixes 7a09d92 et 4bed166 inclus).
 * Diverge de la v1.3 depuis l'ajout des bonus « conditions excellentes »
 * (v2.x) : la parité TS n'est plus une référence, les tests font foi.
 */

// ─── Seuils ──────────────────────────────────────────────────────────────────

/** °C minimal (avant correctif d'orientation) — froid sec ≈ bonne friction, on ne mord que près de 0°C. */
private const val MIN_TEMP = 2.0

/** km/h — vent de face pour séchage actif. */
private const val MIN_WIND_DRYING = 15.0

/** mm/h — précipitation active. */
private const val MAX_PRECIP = 0.5

// ─── Poids du modèle additif ─────────────────────────────────────────────────

/**
 * Tous les poids du modèle de score. Modifiez ces valeurs pour recalibrer
 * le score sans toucher à la logique.
 *
 * Échelle : [0, 10]. BASE = 6 (conditions neutres, avant bonus/malus).
 * Seuils : score >= THRESHOLD_GOOD → GOOD, >= THRESHOLD_OK → OK, sinon BAD.
 */
object ScoreWeights {
    const val BASE = 6.0

    // Précipitations actives (par mm/h)
    const val PRECIP_ACTIVE_PER_MM = -2.5

    // Probabilité de pluie
    const val PRECIP_PROB_HIGH = -3.0
    const val PRECIP_PROB_HIGH_THRESHOLD = 70.0
    const val PRECIP_PROB_WARN = -2.0
    const val PRECIP_PROB_WARN_THRESHOLD = 40.0

    // Pluie récente — coefficient par mm cumulé dans la fenêtre de lookback.
    // Dépend du type de roche : le granite/grès (fast) sèche vite → pénalité douce ;
    // le calcaire/conglomérat (slow), souvent friable, reste humide → pénalité sévère.
    const val RECENT_RAIN_PER_MM_FAST = -0.5
    const val RECENT_RAIN_PER_MM_SLOW = -1.5

    // Multiplicateur d'exposition au vent sur la pluie récente
    // 0 = vent de face fort → séchage actif → pas de malus pluie
    const val EXPOSURE_SHELTERED = 1.00
    const val EXPOSURE_SIDE = 0.75
    const val EXPOSURE_EXPOSED_WEAK = 0.50
    const val EXPOSURE_EXPOSED_STRONG = 0.00

    // Température effective (par degré en dessous du seuil) — pénalité résiduelle
    // faible : le froid sec n'est pas un problème pour la grimpe (meilleure friction).
    const val TEMP_COLD_PER_DEG = 0.5

    // Bonus vent séchant (face exposée + vent >= MIN_WIND_DRYING)
    const val WIND_DRYING_BONUS = 1.0

    // Vent fort (inconfort / sécurité)
    const val WIND_STRONG_PENALTY = -1.5
    const val WIND_STRONG_THRESHOLD = 60.0 // km/h

    // Bonus ciel dégagé (codes WMO 0 et 1)
    const val WMO_CLEAR_BONUS = 0.5

    // Bonus « conditions excellentes » — appliqués uniquement sur un créneau
    // propre : aucun malus déclenché (précip/WMO/proba/vent fort/froid) et
    // aucune pluie récente. Ils rendent le haut de l'échelle atteignable :
    // BASE + clair + sec + temp idéale + vent séchant = 10.0 pile.
    const val DRY_STREAK_BONUS = 1.5       // 0 mm sur la fenêtre lookback de la roche
    const val TEMP_IDEAL_BONUS = 1.0       // friction optimale
    const val TEMP_IDEAL_MIN = 5.0         // °C — bande décalée par le correctif d'orientation
    const val TEMP_IDEAL_MAX = 18.0        // °C

    // Malus par catégorie WMO (appliqués une seule fois, pas cumulables)
    const val WMO_STORM_PENALTY = -6.0      // orages
    const val WMO_SNOW_PENALTY = -4.0       // neige / grésil
    const val WMO_HEAVY_RAIN_PENALTY = -3.0 // pluie forte / averses fortes

    // Seuils de dérivation WeatherScore
    const val THRESHOLD_GOOD = 6.0
    const val THRESHOLD_OK = 4.0
}

// ─── Codes WMO par catégorie ──────────────────────────────────────────────────

private val WMO_CODES_STORM = setOf(95, 96, 99)
private val WMO_CODES_SNOW = setOf(71, 73, 75, 77, 85, 86)
private val WMO_CODES_RAIN = setOf(55, 57, 63, 65, 67, 81, 82)
private val WMO_CODES_CLEAR = setOf(0, 1)
private val WMO_CODES_BAD = WMO_CODES_STORM + WMO_CODES_SNOW + WMO_CODES_RAIN

// ─── Orientation → correctif température ─────────────────────────────────────

/**
 * Correctif appliqué à MIN_TEMP selon l'ensoleillement de la paroi.
 * Face N plus froide (seuil relevé), face S plus chaude (seuil abaissé).
 */
private val ORIENTATION_TEMP_ADJUST = mapOf(
    Orientation.N to 4.0, Orientation.NE to 3.0, Orientation.NW to 2.0,
    Orientation.E to 0.0, Orientation.W to 0.0,
    Orientation.SE to -1.0, Orientation.S to -2.0, Orientation.SW to -2.0,
)

// ─── Orientation → degrés ────────────────────────────────────────────────────

private val ORIENTATION_DEG = mapOf(
    Orientation.N to 0.0, Orientation.NE to 45.0, Orientation.E to 90.0, Orientation.SE to 135.0,
    Orientation.S to 180.0, Orientation.SW to 225.0, Orientation.W to 270.0, Orientation.NW to 315.0,
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

private enum class WindExposure { EXPOSED, SIDE, SHELTERED }

private fun getWindExposure(windDir: Double, orientation: Orientation): WindExposure {
    val wallDeg = ORIENTATION_DEG.getValue(orientation)
    var diff = Math.abs(windDir - wallDeg) % 360.0
    if (diff > 180.0) diff = 360.0 - diff
    return when {
        diff <= 60.0 -> WindExposure.EXPOSED
        diff <= 120.0 -> WindExposure.SIDE
        else -> WindExposure.SHELTERED
    }
}

private fun numericToWeatherScore(n: Double): WeatherScore = when {
    n >= ScoreWeights.THRESHOLD_GOOD -> WeatherScore.GOOD
    n >= ScoreWeights.THRESHOLD_OK -> WeatherScore.OK
    else -> WeatherScore.BAD
}

private fun clamp(n: Double): Double = n.coerceIn(0.0, 10.0)

// ─── Score orienté (utilisé par getSubSectorSummary) ─────────────────────────

/**
 * Calcule le score d'un créneau en tenant compte de l'orientation de la paroi
 * et du type de roche (vitesse de séchage).
 */
private fun scoreSlotNumeric(
    slot: WeatherSlot,
    orientation: Orientation,
    rockType: RockType,
): Double {
    var score = ScoreWeights.BASE

    // 1. Précipitations actives
    if (slot.precipitation > MAX_PRECIP) {
        score += ScoreWeights.PRECIP_ACTIVE_PER_MM * slot.precipitation
    } else {
        // Bonus/malus WMO (mutuellement exclusifs, ordre décroissant de gravité)
        when {
            slot.weatherCode in WMO_CODES_STORM -> score += ScoreWeights.WMO_STORM_PENALTY
            slot.weatherCode in WMO_CODES_SNOW -> score += ScoreWeights.WMO_SNOW_PENALTY
            slot.weatherCode in WMO_CODES_RAIN -> score += ScoreWeights.WMO_HEAVY_RAIN_PENALTY
            slot.weatherCode in WMO_CODES_CLEAR -> score += ScoreWeights.WMO_CLEAR_BONUS
        }
    }

    // 2. Probabilité de pluie
    if (slot.precipProbability >= ScoreWeights.PRECIP_PROB_HIGH_THRESHOLD) {
        score += ScoreWeights.PRECIP_PROB_HIGH
    } else if (slot.precipProbability >= ScoreWeights.PRECIP_PROB_WARN_THRESHOLD) {
        score += ScoreWeights.PRECIP_PROB_WARN
    }

    // 3. Température effective (avec correctif d'orientation)
    val orientationAdjust = ORIENTATION_TEMP_ADJUST.getValue(orientation)
    val effectiveMinTemp = MIN_TEMP + orientationAdjust
    if (slot.temperature < effectiveMinTemp) {
        score -= (effectiveMinTemp - slot.temperature) * ScoreWeights.TEMP_COLD_PER_DEG
    }

    // 4. Vent fort
    if (slot.windspeed > ScoreWeights.WIND_STRONG_THRESHOLD) {
        score += ScoreWeights.WIND_STRONG_PENALTY
    }

    // 5. Pluie récente × exposition au vent — fenêtre et sévérité selon le type de roche
    val recentRainMm = if (rockType == RockType.FAST) slot.recentRainMm6h else slot.recentRainMm24h
    val recentRainCoef = if (rockType == RockType.FAST) {
        ScoreWeights.RECENT_RAIN_PER_MM_FAST
    } else {
        ScoreWeights.RECENT_RAIN_PER_MM_SLOW
    }
    if (recentRainMm > 0) {
        val exposureMultiplier = when (getWindExposure(slot.windDirection, orientation)) {
            WindExposure.SHELTERED -> ScoreWeights.EXPOSURE_SHELTERED
            WindExposure.SIDE -> ScoreWeights.EXPOSURE_SIDE
            WindExposure.EXPOSED ->
                if (slot.windspeed >= MIN_WIND_DRYING) ScoreWeights.EXPOSURE_EXPOSED_STRONG
                else ScoreWeights.EXPOSURE_EXPOSED_WEAK
        }
        score += recentRainCoef * recentRainMm * exposureMultiplier

        // Vent de face fort : le malus pluie est déjà annulé via EXPOSURE_EXPOSED_STRONG = 0.
    } else if (
        slot.precipitation == 0.0 &&
        getWindExposure(slot.windDirection, orientation) == WindExposure.EXPOSED &&
        slot.windspeed >= MIN_WIND_DRYING
    ) {
        // Vent de face, pas de pluie : conditions idéales de séchage
        score += ScoreWeights.WIND_DRYING_BONUS
    }

    // 6. Bonus « conditions excellentes » — uniquement si aucun malus n'a été
    // déclenché et que la roche est sèche : c'est ce qui distingue le haut de
    // l'échelle (8–10) d'un simple créneau sans problème (~6.5).
    val clean = slot.precipitation == 0.0 &&
        slot.weatherCode !in WMO_CODES_BAD &&
        slot.precipProbability < ScoreWeights.PRECIP_PROB_WARN_THRESHOLD &&
        slot.windspeed <= ScoreWeights.WIND_STRONG_THRESHOLD &&
        slot.temperature >= effectiveMinTemp &&
        recentRainMm == 0.0
    if (clean) {
        score += ScoreWeights.DRY_STREAK_BONUS
        // Bande de friction idéale, décalée par l'orientation comme le seuil
        // froid : face N grimpe plus chaud, face S plus frais.
        val idealMin = ScoreWeights.TEMP_IDEAL_MIN + orientationAdjust
        val idealMax = ScoreWeights.TEMP_IDEAL_MAX + orientationAdjust
        if (slot.temperature in idealMin..idealMax) {
            score += ScoreWeights.TEMP_IDEAL_BONUS
        }
    }

    return clamp(score)
}

// ─── Score de base (sans orientation ni type de roche) ────────────────────────

/**
 * Score générique d'un créneau, sans correctif d'orientation ni rockType.
 * Aucun écran ne le consomme — il sert de référence de calibration du modèle
 * dans les tests. Pour la pluie récente, faute de connaître la roche, il
 * prend un moyen terme : coefficient sévère (slow) sur la fenêtre courte (6h).
 */
private fun scoreSlotBase(slot: WeatherSlot): Double {
    var score = ScoreWeights.BASE

    if (slot.precipitation > MAX_PRECIP) {
        score += ScoreWeights.PRECIP_ACTIVE_PER_MM * slot.precipitation
    } else {
        when {
            slot.weatherCode in WMO_CODES_STORM -> score += ScoreWeights.WMO_STORM_PENALTY
            slot.weatherCode in WMO_CODES_SNOW -> score += ScoreWeights.WMO_SNOW_PENALTY
            slot.weatherCode in WMO_CODES_RAIN -> score += ScoreWeights.WMO_HEAVY_RAIN_PENALTY
            slot.weatherCode in WMO_CODES_CLEAR -> score += ScoreWeights.WMO_CLEAR_BONUS
        }
    }

    if (slot.precipProbability >= ScoreWeights.PRECIP_PROB_HIGH_THRESHOLD) {
        score += ScoreWeights.PRECIP_PROB_HIGH
    } else if (slot.precipProbability >= ScoreWeights.PRECIP_PROB_WARN_THRESHOLD) {
        score += ScoreWeights.PRECIP_PROB_WARN
    }

    if (slot.temperature < MIN_TEMP) {
        score -= (MIN_TEMP - slot.temperature) * ScoreWeights.TEMP_COLD_PER_DEG
    }

    // Pluie récente : moyen terme roche inconnue — coefficient slow × fenêtre 6h
    // (la pluie tombée entre H-24 et H-6 n'est donc pas comptée ici).
    if (slot.recentRainMm6h > 0) {
        score += ScoreWeights.RECENT_RAIN_PER_MM_SLOW * slot.recentRainMm6h * ScoreWeights.EXPOSURE_SHELTERED
    }

    // Bonus « conditions excellentes » — même gating que scoreSlotNumeric,
    // convention roche inconnue : fenêtre 6h, bande de température brute.
    val clean = slot.precipitation == 0.0 &&
        slot.weatherCode !in WMO_CODES_BAD &&
        slot.precipProbability < ScoreWeights.PRECIP_PROB_WARN_THRESHOLD &&
        slot.temperature >= MIN_TEMP &&
        slot.recentRainMm6h == 0.0
    if (clean) {
        score += ScoreWeights.DRY_STREAK_BONUS
        if (slot.temperature in ScoreWeights.TEMP_IDEAL_MIN..ScoreWeights.TEMP_IDEAL_MAX) {
            score += ScoreWeights.TEMP_IDEAL_BONUS
        }
    }

    return clamp(score)
}

// ─── Construction du forecast brut ───────────────────────────────────────────

/**
 * Transforme la réponse horaire Open-Meteo en WeatherForecast.
 * Le numericScore de chaque slot est une estimation générique (sans
 * orientation ni rockType) ; il sert de référence de calibration dans les tests.
 */
fun buildForecast(hourly: OpenMeteoHourly): WeatherForecast {
    val slots = hourly.time.mapIndexed { i, t ->
        val date = t.substring(0, 10)
        val hour = t.substring(11, 13).toInt()

        val precipitation = hourly.precipitation.getOrElse(i) { 0.0 }
        val precipProbability = hourly.precipitationProbability?.getOrElse(i) { 0.0 } ?: 0.0
        val weatherCode = hourly.weathercode.getOrElse(i) { 0 }
        val windspeed = hourly.windspeed10m.getOrElse(i) { 0.0 }
        val windDirection = hourly.winddirection10m?.getOrElse(i) { 0.0 } ?: 0.0
        val temperature = hourly.temperature2m.getOrElse(i) { 0.0 }

        val start6 = maxOf(0, i - 6)
        val start24 = maxOf(0, i - 24)
        val recentRainMm6h = (start6 until i).sumOf { hourly.precipitation.getOrElse(it) { 0.0 } }
        val recentRainMm24h = (start24 until i).sumOf { hourly.precipitation.getOrElse(it) { 0.0 } }

        val slot = WeatherSlot(
            date = date, hour = hour,
            score = WeatherScore.GOOD, // placeholder, recalculé ci-dessous
            numericScore = 0.0,
            temperature = temperature,
            windspeed = windspeed,
            windDirection = windDirection,
            precipitation = precipitation,
            precipProbability = precipProbability,
            weatherCode = weatherCode,
            recentRainMm6h = recentRainMm6h,
            recentRainMm24h = recentRainMm24h,
        )

        val numericScore = scoreSlotBase(slot)
        slot.copy(numericScore = numericScore, score = numericToWeatherScore(numericScore))
    }

    return WeatherForecast(slots = slots, source = "open-meteo", fetchedAt = Instant.now().toString())
}

// ─── Utilitaire timezone ──────────────────────────────────────────────────────

/**
 * Convertit une date + heure en heure locale Europe/Paris vers un timestamp UTC.
 * Le TS approximait l'offset via l'heure de midi (pas de lib timezone en RN) ;
 * java.time le fait exactement — comportement identique sur les heures de jour.
 */
private fun parisLocalToUTC(dateStr: String, hour: Int): Long =
    LocalDate.parse(dateStr).atTime(hour, 0).atZone(PARIS_ZONE).toInstant().toEpochMilli()

// ─── Résumé par sous-secteur ──────────────────────────────────────────────────

/**
 * Calcule le meilleur score d'un sous-secteur sur les prochaines heures de
 * jour (7h–20h), avec correctif d'orientation et de type de roche.
 *
 * Retourne aussi la première fenêtre de créneaux "good" consécutifs.
 * [nowMs] n'est paramétrable que pour les tests (équivalent des fake timers Jest).
 */
fun getSubSectorSummary(
    forecast: WeatherForecast,
    orientation: Orientation,
    rockType: RockType = RockType.SLOW,
    horizonHours: Int = 72,
    nowMs: Long = System.currentTimeMillis(),
): SubSectorSummary {
    val cutoff = nowMs + horizonHours * 3_600_000L

    val relevant = forecast.slots.filter { slot ->
        if (slot.hour < 7 || slot.hour > 20) return@filter false
        val ts = parisLocalToUTC(slot.date, slot.hour)
        ts > nowMs && ts < cutoff
    }

    if (relevant.isEmpty()) return SubSectorSummary(WeatherScore.BAD, 0.0, null)

    // Score chaque créneau avec l'orientation et le type de roche
    val scored = relevant.map { it to scoreSlotNumeric(it, orientation, rockType) }

    // Score global = meilleur score numérique observé
    var bestNumericScore = 0.0
    for ((_, s) in scored) {
        if (s > bestNumericScore) bestNumericScore = s
    }

    // Première fenêtre de créneaux "good" consécutifs.
    // La liste ne contient que les heures de jour : le créneau de 20h et celui
    // de 7h du lendemain y sont adjacents. Une fenêtre ne doit pas enjamber
    // cette coupure → on exige la vraie contiguïté temporelle (même date,
    // heure suivante) pour la prolonger.
    var nextGoodWindow: GoodWindow? = null
    var windowStart = -1

    for (i in 0..scored.size) {
        val isGood = i < scored.size && scored[i].second >= ScoreWeights.THRESHOLD_GOOD
        val contiguous = i > 0 && i < scored.size &&
            scored[i].first.date == scored[i - 1].first.date &&
            scored[i].first.hour == scored[i - 1].first.hour + 1

        if (windowStart < 0) {
            if (isGood) windowStart = i
        } else if (!isGood || !contiguous) {
            val first = scored[windowStart].first
            val last = scored[i - 1].first
            nextGoodWindow = GoodWindow(date = first.date, startHour = first.hour, endHour = last.hour + 1)
            break
        }
    }

    return SubSectorSummary(numericToWeatherScore(bestNumericScore), bestNumericScore, nextGoodWindow)
}
