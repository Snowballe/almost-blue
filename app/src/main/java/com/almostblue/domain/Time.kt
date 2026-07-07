package com.almostblue.domain

import java.time.Instant
import java.time.ZoneId

/**
 * Fuseau de référence de l'app — l'API Open-Meteo est interrogée en heure de
 * Paris et la dédup du digest raisonne en jour calendaire parisien (parité v1.3).
 */
val PARIS_ZONE: ZoneId = ZoneId.of("Europe/Paris")

/**
 * Âge relatif d'un timestamp ISO (WeatherForecast.fetchedAt) : « à l'instant »
 * (< 60 s), « il y a X min » (< 60 min), sinon « il y a X h ».
 * Timestamp illisible ou futur → « à l'instant » (au bénéfice du doute).
 */
fun formatRelativeAge(fetchedAtIso: String, nowMs: Long): String {
    val ageMs = try {
        nowMs - Instant.parse(fetchedAtIso).toEpochMilli()
    } catch (_: Exception) {
        return "à l'instant"
    }
    val minutes = ageMs / 60_000L
    return when {
        minutes < 1 -> "à l'instant"
        minutes < 60 -> "il y a $minutes min"
        else -> "il y a ${minutes / 60} h"
    }
}
