package com.almostblue

import android.app.Application
import com.almostblue.background.CheckWorker
import com.almostblue.notifications.initNotificationChannel
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AlmostBlueApp : Application() {

    /** Scope applicatif pour les initialisations asynchrones (planifications). */
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    /** Verrou anti-checks concurrents — équivalent du checkInProgress v1.3. */
    private val checkInProgress = AtomicBoolean(false)

    override fun onCreate() {
        super.onCreate()
        initNotificationChannel(this)

        // Équivalent du useNotificationSetup de la v1.3 : (re-)planifier le check
        // périodique et le digest au démarrage PUIS à chaque changement des
        // réglages concernés (intervalle, toggles, heure du digest). La première
        // émission du Flow couvre le démarrage. Comme en v1.3, chaque
        // (re-)configuration déclenche aussi un check différé de 4 s pour ne pas
        // concurrencer l'hydratation et les requêtes réseau initiales.
        val graph = AppGraph.get(this)
        appScope.launch {
            var immediateCheck: Job? = null
            graph.settingsRepo.settings
                .map {
                    listOf(
                        it.notificationsEnabled,
                        it.checkIntervalMinutes,
                        it.digestEnabled,
                        it.digestHour,
                    )
                }
                .distinctUntilChanged()
                .collect {
                    CheckWorker.schedule(this@AlmostBlueApp)
                    graph.digestScheduler.scheduleNext()

                    // Seul le délai de 4 s est annulable (cleanup du setTimeout
                    // v1.3) ; un check déjà parti se termine, le verrou évite
                    // d'en empiler un deuxième.
                    immediateCheck?.cancel()
                    immediateCheck = launch {
                        delay(4_000)
                        if (checkInProgress.compareAndSet(false, true)) {
                            try {
                                withContext(NonCancellable) {
                                    runCatching { graph.weatherNotifier.checkAndNotify() }
                                }
                            } finally {
                                checkInProgress.set(false)
                            }
                        }
                    }
                }
        }
    }
}
