package com.almostblue.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.almostblue.domain.WeatherScore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * État de notifications — remplace useNotificationStore.ts.
 * lastScores : clé `sectorId:orientation:rockType` → dernier score connu (détection
 * des transitions !good → good). lastDigestDate/Summary : gardes anti-doublon
 * du digest quotidien. lastCheckAtMs/lastDigestFiredAtMs : journal de fiabilité
 * (diagnostic Doze/OEM, affiché dans Réglages).
 */
class NotificationRepository(private val dataStore: DataStore<Preferences>) {

    private val scoresKey = stringPreferencesKey("lastScores")
    private val digestDateKey = stringPreferencesKey("lastDigestDate")
    private val digestSummaryKey = stringPreferencesKey("lastDigestSummary")
    private val checkAtKey = longPreferencesKey("lastCheckAtMs")
    private val digestFiredAtKey = longPreferencesKey("lastDigestFiredAtMs")

    private val json = Json

    val lastScores: Flow<Map<String, WeatherScore>> = dataStore.data.map { p ->
        p[scoresKey]?.let { raw ->
            runCatching {
                json.decodeFromString<Map<String, String>>(raw)
                    .mapValues { (_, v) -> WeatherScore.valueOf(v) }
            }.getOrElse { emptyMap() }
        } ?: emptyMap()
    }

    val lastDigestDate: Flow<String?> = dataStore.data.map { it[digestDateKey] }
    val lastDigestSummary: Flow<String?> = dataStore.data.map { it[digestSummaryKey] }
    val lastCheckAtMs: Flow<Long?> = dataStore.data.map { it[checkAtKey] }
    val lastDigestFiredAtMs: Flow<Long?> = dataStore.data.map { it[digestFiredAtKey] }

    suspend fun setScores(scores: Map<String, WeatherScore>) = dataStore.edit { p ->
        p[scoresKey] = json.encodeToString(scores.mapValues { (_, v) -> v.name })
    }

    suspend fun clearScores() = dataStore.edit { it.remove(scoresKey) }

    suspend fun setLastDigestDate(date: String) = dataStore.edit { it[digestDateKey] = date }

    suspend fun setLastDigestSummary(summary: String) = dataStore.edit { it[digestSummaryKey] = summary }

    suspend fun setLastCheckAtMs(ms: Long) = dataStore.edit { it[checkAtKey] = ms }

    suspend fun setLastDigestFiredAtMs(ms: Long) = dataStore.edit { it[digestFiredAtKey] = ms }
}
