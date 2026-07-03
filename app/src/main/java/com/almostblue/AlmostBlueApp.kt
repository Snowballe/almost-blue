package com.almostblue

import android.app.Application
import com.almostblue.background.CheckWorker
import com.almostblue.notifications.initNotificationChannel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class AlmostBlueApp : Application() {

    /** Scope applicatif pour les initialisations asynchrones (planifications). */
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        initNotificationChannel(this)

        // Équivalent du useNotificationSetup de la v1.3 : (re-)planifier le check
        // périodique et le digest au démarrage, selon les réglages persistés.
        val graph = AppGraph.get(this)
        appScope.launch {
            CheckWorker.schedule(this@AlmostBlueApp)
            graph.digestScheduler.scheduleNext()
        }
    }
}
