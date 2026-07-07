package com.almostblue.background

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.almostblue.AppGraph
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.flow.first

/**
 * Check météo périodique — remplace le BackgroundFetch.configure() de la v1.3.
 * WorkManager persiste la planification au reboot (l'équivalent de startOnBoot)
 * et impose le réseau (NETWORK_TYPE_ANY → CONNECTED).
 */
class CheckWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val graph = AppGraph.get(applicationContext)

        return try {
            graph.weatherNotifier.checkAndNotify()
            // Ré-arme le digest s'il a été perdu (reboot, tir manqué, chaîne
            // cassée) : le check périodique tourne régulièrement, ce qui rend la
            // planification auto-réparante. L'alarme est idempotente (même
            // PendingIntent) → sans danger.
            graph.digestScheduler.scheduleNext()
            // Journal de fiabilité : horodate un passage complet de la chaîne
            // (réseau inclus) — visible dans Réglages pour diagnostiquer Doze/OEM.
            graph.notificationRepo.setLastCheckAtMs(System.currentTimeMillis())
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "weather-check"

        /**
         * (Re-)planifie le check périodique selon l'intervalle des réglages.
         * UPDATE : l'intervalle change sans perdre la prochaine échéance en cours.
         */
        suspend fun schedule(context: Context) {
            val settings = AppGraph.get(context).settingsRepo.settings.first()
            val workManager = WorkManager.getInstance(context)

            if (!settings.notificationsEnabled) {
                workManager.cancelUniqueWork(WORK_NAME)
                return
            }

            val request = PeriodicWorkRequestBuilder<CheckWorker>(
                settings.checkIntervalMinutes.toLong(), TimeUnit.MINUTES,
            )
                .setConstraints(
                    Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build(),
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.MINUTES)
                .build()

            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request,
            )
        }
    }
}
