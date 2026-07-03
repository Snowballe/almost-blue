package com.almostblue.notifications

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings

/**
 * Fiabilité de livraison des notifications planifiées — port de
 * spec/src/utils/notificationReliability.ts + BatteryOptimizationModule.kt,
 * sans pont : tout est natif désormais.
 *
 * Tirer une notification à l'heure exacte même app fermée exige :
 *  - exemption d'optimisation batterie (Doze),
 *  - permission d'alarme exacte (Android 12+).
 */
data class ReliabilityStatus(
    /** true = optimisation batterie ACTIVE pour l'app (mauvais : tir différé en Doze). */
    val batteryOptimized: Boolean,
    /** true = alarmes exactes autorisées (bon). */
    val exactAlarmAllowed: Boolean,
)

fun getReliabilityStatus(context: Context): ReliabilityStatus {
    val powerManager = context.getSystemService(PowerManager::class.java)
    val alarmManager = context.getSystemService(AlarmManager::class.java)
    return ReliabilityStatus(
        batteryOptimized = !powerManager.isIgnoringBatteryOptimizations(context.packageName),
        exactAlarmAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            alarmManager.canScheduleExactAlarms(),
    )
}

/** true si la livraison à l'heure pile est fiable (rien à régler de bloquant). */
fun isReliabilityOk(status: ReliabilityStatus): Boolean =
    !status.batteryOptimized && status.exactAlarmAllowed

/**
 * Affiche la popup système « Autoriser / Refuser » d'exemption batterie
 * (logique de l'ancien BatteryOptimizationModule.requestIgnore, inlinée).
 */
fun requestBatteryOptimizationExemption(context: Context) {
    val intent = Intent(
        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        Uri.parse("package:${context.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
}

/** Ouvre l'écran système des alarmes exactes (Android 12+). */
fun openAlarmPermissionSettings(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val intent = Intent(
        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
        Uri.parse("package:${context.packageName}"),
    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
}
