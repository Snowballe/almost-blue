package com.almostblue.notifications

import com.almostblue.data.SettingsRepository
import java.time.Duration
import java.time.ZonedDateTime
import kotlinx.coroutines.flow.first

/**
 * Calcule le délai jusqu'au prochain digest — port de scheduleNextDigest()
 * (spec/src/services/notificationService.ts). L'exécution passe par
 * AlarmManager.setExactAndAllowWhileIdle (l'équivalent natif du
 * forceAlarmManager de react-native-background-fetch).
 */
class DigestScheduler(
    private val settingsRepo: SettingsRepository,
    /** Pose l'alarme exacte — implémentation Android : AlarmManager ; fake en test. */
    private val scheduleExact: (delayMs: Long) -> Unit,
    private val now: () -> ZonedDateTime = { ZonedDateTime.now() },
) {

    /**
     * Planifie le prochain digest pour aujourd'hui (si l'heure n'est pas encore
     * passée) ou pour demain, à l'heure configurée. Heure locale du device,
     * comme en v1.3 (cas attendu : device sur Paris).
     */
    suspend fun scheduleNext() {
        val settings = settingsRepo.settings.first()
        if (!settings.notificationsEnabled || !settings.digestEnabled) return

        val current = now()
        var next = current.withHour(settings.digestHour).withMinute(0).withSecond(0).withNano(0)
        if (!next.isAfter(current)) next = next.plusDays(1)

        scheduleExact(Duration.between(current, next).toMillis())
    }
}
