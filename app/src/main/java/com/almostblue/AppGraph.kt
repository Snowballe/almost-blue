package com.almostblue

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import androidx.datastore.preferences.preferencesDataStore
import com.almostblue.background.DigestReceiver
import com.almostblue.data.NotificationRepository
import com.almostblue.data.OpenMeteoClient
import com.almostblue.data.SectorsRepository
import com.almostblue.data.SettingsRepository
import com.almostblue.notifications.AndroidNotifier
import com.almostblue.notifications.DigestScheduler
import com.almostblue.notifications.WeatherNotifier

/**
 * Graphe d'objets de l'app (DI minimaliste — pas de framework, light and fast).
 * Un seul DataStore par ancien store Zustand, un seul client météo partagé.
 */
private val Context.settingsStore by preferencesDataStore(name = "settings")
private val Context.sectorsStore by preferencesDataStore(name = "sectors")
private val Context.notificationsStore by preferencesDataStore(name = "notifications")

class AppGraph(context: Context) {
    private val appContext = context.applicationContext

    val settingsRepo = SettingsRepository(appContext.settingsStore)
    val sectorsRepo = SectorsRepository(appContext.sectorsStore)
    val notificationRepo = NotificationRepository(appContext.notificationsStore)
    val openMeteo = OpenMeteoClient()

    val weatherNotifier = WeatherNotifier(
        settingsRepo = settingsRepo,
        sectorsRepo = sectorsRepo,
        notificationRepo = notificationRepo,
        fetchForecast = openMeteo::getCachedForecast,
        notifier = AndroidNotifier(appContext),
    )

    val digestScheduler = DigestScheduler(
        settingsRepo = settingsRepo,
        scheduleExact = { delayMs -> scheduleExactAlarm(appContext, delayMs) },
    )

    companion object {
        @Volatile
        private var instance: AppGraph? = null

        fun get(context: Context): AppGraph =
            instance ?: synchronized(this) {
                instance ?: AppGraph(context).also { instance = it }
            }
    }
}

/**
 * Pose l'alarme exacte du digest — équivalent natif du
 * forceAlarmManager/setExactAndAllowWhileIdle de la v1.3. Un seul PendingIntent
 * (FLAG_UPDATE_CURRENT) : re-planifier remplace l'alarme précédente, la chaîne
 * reste idempotente comme scheduleTask par taskId.
 */
fun scheduleExactAlarm(context: Context, delayMs: Long) {
    val alarmManager = context.getSystemService(AlarmManager::class.java)
    val pendingIntent = PendingIntent.getBroadcast(
        context,
        0,
        Intent(context, DigestReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val triggerAt = SystemClock.elapsedRealtime() + delayMs
    val canExact = android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.S ||
        alarmManager.canScheduleExactAlarms()

    if (canExact) {
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent,
        )
    } else {
        // Permission d'alarme exacte refusée → repli inexact (la section
        // Fiabilité guide l'utilisateur vers le réglage système).
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent,
        )
    }
}
