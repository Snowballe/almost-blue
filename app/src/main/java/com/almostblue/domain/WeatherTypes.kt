package com.almostblue.domain

/** Port de spec/src/types/sector.ts (Orientation) et spec/src/types/weather.ts. */

enum class Orientation { N, NE, E, SE, S, SW, W, NW }

/** fast = granite/grès (sèche en quelques heures) ; slow = calcaire/conglomérat (peut suinter 24h+). */
enum class RockType { FAST, SLOW }

enum class WeatherScore { GOOD, OK, BAD }

data class WeatherSlot(
    val date: String,
    val hour: Int,
    /** Score générique dérivé du numericScore (sans orientation ni rockType). */
    val score: WeatherScore,
    /** Score numérique additif, de 0 à 10. */
    val numericScore: Double,
    val temperature: Double,
    val windspeed: Double,
    /** Direction d'où vient le vent, en degrés météo (0° = N, 90° = E…). */
    val windDirection: Double,
    val precipitation: Double,
    val precipProbability: Double,
    val weatherCode: Int,
    /** mm de pluie cumulés sur les 6h précédentes (fenêtre roche rapide). */
    val recentRainMm6h: Double,
    /** mm de pluie cumulés sur les 24h précédentes (fenêtre roche lente). */
    val recentRainMm24h: Double,
)

data class GoodWindow(
    val date: String,
    val startHour: Int,
    val endHour: Int,
)

data class SubSectorSummary(
    val score: WeatherScore,
    /** Score numérique du meilleur créneau dans la fenêtre de 72h. */
    val numericScore: Double,
    /** Première fenêtre de créneaux consécutifs "good" ; null si aucune. */
    val nextGoodWindow: GoodWindow?,
)

data class WeatherForecast(
    val slots: List<WeatherSlot>,
    val source: String = "open-meteo",
    val fetchedAt: String,
)
