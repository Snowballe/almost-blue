package com.almostblue.background

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.almostblue.AppGraph
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Tir du digest quotidien à l'heure exacte (AlarmManager) — l'équivalent natif
 * de la tâche headless DIGEST_TASK_ID de la v1.3 : envoie le digest puis
 * ré-arme l'alarme du lendemain.
 */
class DigestReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val graph = AppGraph.get(context)
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                graph.weatherNotifier.sendDailyDigest()
                graph.digestScheduler.scheduleNext()
            } catch (_: Exception) {
                // Le prochain CheckWorker ré-armera la chaîne (auto-réparation).
            } finally {
                pending.finish()
            }
        }
    }
}
