package com.almostblue.background

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.almostblue.AppGraph
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Au reboot : WorkManager restaure seul le check périodique, mais les alarmes
 * AlarmManager sont perdues → on ré-arme le digest (équivalent startOnBoot v1.3).
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                AppGraph.get(context).digestScheduler.scheduleNext()
            } catch (_: Exception) {
                // Le prochain CheckWorker ré-armera la chaîne.
            } finally {
                pending.finish()
            }
        }
    }
}
