package com.almostblue.data

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.almostblue.domain.OFFSEASON_END
import com.almostblue.domain.OFFSEASON_START
import com.almostblue.domain.SeasonBound
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Réglages — remplace useSettingsStore.ts (Zustand persist).
 * Mêmes champs, mêmes valeurs par défaut que la v1.3.
 */

enum class ColorScheme { DARK, LIGHT }

/** Intervalles de check autorisés (minutes) — labels UI : 1h/3h/6h/12h/24h. */
val CHECK_INTERVALS = listOf(60, 180, 360, 720, 1440)

/** Labels UI des intervalles — port de CHECK_INTERVAL_LABELS (useSettingsStore.ts). */
val CHECK_INTERVAL_LABELS = mapOf(
    60 to "1h",
    180 to "3h",
    360 to "6h",
    720 to "12h",
    1440 to "24h",
)

data class Settings(
    val notificationsEnabled: Boolean = true,
    val checkIntervalMinutes: Int = 180,
    val notificationsInSummer: Boolean = false,
    val hibernationEnabled: Boolean = true,
    val colorScheme: ColorScheme = ColorScheme.DARK,
    val offseasonStart: SeasonBound = OFFSEASON_START,
    val offseasonEnd: SeasonBound = OFFSEASON_END,
    val overrideHibernation: Boolean = false,
    val digestEnabled: Boolean = true,
    val digestHour: Int = 10,
    val reliabilityPromptDone: Boolean = false,
)

private val DEFAULTS = Settings()

class SettingsRepository(private val dataStore: DataStore<Preferences>) {

    private object Keys {
        val notificationsEnabled = booleanPreferencesKey("notificationsEnabled")
        val checkIntervalMinutes = intPreferencesKey("checkIntervalMinutes")
        val notificationsInSummer = booleanPreferencesKey("notificationsInSummer")
        val hibernationEnabled = booleanPreferencesKey("hibernationEnabled")
        val colorScheme = stringPreferencesKey("colorScheme")
        val offseasonStartMonth = intPreferencesKey("offseasonStartMonth")
        val offseasonStartDay = intPreferencesKey("offseasonStartDay")
        val offseasonEndMonth = intPreferencesKey("offseasonEndMonth")
        val offseasonEndDay = intPreferencesKey("offseasonEndDay")
        val overrideHibernation = booleanPreferencesKey("overrideHibernation")
        val digestEnabled = booleanPreferencesKey("digestEnabled")
        val digestHour = intPreferencesKey("digestHour")
        val reliabilityPromptDone = booleanPreferencesKey("reliabilityPromptDone")
    }

    val settings: Flow<Settings> = dataStore.data.map { p ->
        Settings(
            notificationsEnabled = p[Keys.notificationsEnabled] ?: DEFAULTS.notificationsEnabled,
            checkIntervalMinutes = p[Keys.checkIntervalMinutes] ?: DEFAULTS.checkIntervalMinutes,
            notificationsInSummer = p[Keys.notificationsInSummer] ?: DEFAULTS.notificationsInSummer,
            hibernationEnabled = p[Keys.hibernationEnabled] ?: DEFAULTS.hibernationEnabled,
            colorScheme = p[Keys.colorScheme]?.let { runCatching { ColorScheme.valueOf(it) }.getOrNull() }
                ?: DEFAULTS.colorScheme,
            offseasonStart = SeasonBound(
                month = p[Keys.offseasonStartMonth] ?: DEFAULTS.offseasonStart.month,
                day = p[Keys.offseasonStartDay] ?: DEFAULTS.offseasonStart.day,
            ),
            offseasonEnd = SeasonBound(
                month = p[Keys.offseasonEndMonth] ?: DEFAULTS.offseasonEnd.month,
                day = p[Keys.offseasonEndDay] ?: DEFAULTS.offseasonEnd.day,
            ),
            overrideHibernation = p[Keys.overrideHibernation] ?: DEFAULTS.overrideHibernation,
            digestEnabled = p[Keys.digestEnabled] ?: DEFAULTS.digestEnabled,
            digestHour = p[Keys.digestHour] ?: DEFAULTS.digestHour,
            reliabilityPromptDone = p[Keys.reliabilityPromptDone] ?: DEFAULTS.reliabilityPromptDone,
        )
    }

    suspend fun setNotificationsEnabled(value: Boolean) = dataStore.edit { it[Keys.notificationsEnabled] = value }
    suspend fun setCheckIntervalMinutes(value: Int) = dataStore.edit { it[Keys.checkIntervalMinutes] = value }
    suspend fun setNotificationsInSummer(value: Boolean) = dataStore.edit { it[Keys.notificationsInSummer] = value }
    suspend fun setHibernationEnabled(value: Boolean) = dataStore.edit { it[Keys.hibernationEnabled] = value }
    suspend fun setColorScheme(value: ColorScheme) = dataStore.edit { it[Keys.colorScheme] = value.name }
    suspend fun setOverrideHibernation(value: Boolean) = dataStore.edit { it[Keys.overrideHibernation] = value }
    suspend fun setDigestEnabled(value: Boolean) = dataStore.edit { it[Keys.digestEnabled] = value }
    suspend fun setDigestHour(value: Int) = dataStore.edit { it[Keys.digestHour] = value }
    suspend fun setReliabilityPromptDone(value: Boolean) = dataStore.edit { it[Keys.reliabilityPromptDone] = value }

    suspend fun setOffseasonStart(value: SeasonBound) = dataStore.edit {
        it[Keys.offseasonStartMonth] = value.month
        it[Keys.offseasonStartDay] = value.day
    }

    suspend fun setOffseasonEnd(value: SeasonBound) = dataStore.edit {
        it[Keys.offseasonEndMonth] = value.month
        it[Keys.offseasonEndDay] = value.day
    }

    /** Remet uniquement la fenêtre hors-saison aux dates par défaut (1er nov → 31 mars). */
    suspend fun resetOffseasonDates() = dataStore.edit {
        it.remove(Keys.offseasonStartMonth)
        it.remove(Keys.offseasonStartDay)
        it.remove(Keys.offseasonEndMonth)
        it.remove(Keys.offseasonEndDay)
    }

    /** Remet tous les réglages aux valeurs par défaut. */
    suspend fun resetAll() = dataStore.edit { it.clear() }
}
