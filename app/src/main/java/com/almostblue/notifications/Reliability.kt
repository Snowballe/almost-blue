package com.almostblue.notifications

import android.app.AlarmManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import java.util.Locale

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
    /** true = un gestionnaire de démarrage OEM est présent et doit être réglé. */
    val needsPowerManager: Boolean,
)

fun getReliabilityStatus(context: Context): ReliabilityStatus {
    val powerManager = context.getSystemService(PowerManager::class.java)
    val alarmManager = context.getSystemService(AlarmManager::class.java)
    return ReliabilityStatus(
        batteryOptimized = !powerManager.isIgnoringBatteryOptimizations(context.packageName),
        exactAlarmAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            alarmManager.canScheduleExactAlarms(),
        needsPowerManager = findPowerManagerIntent(context) != null,
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

/** Ouvre le gestionnaire de démarrage OEM s'il a été détecté. */
fun openPowerManagerSettings(context: Context) {
    val intent = findPowerManagerIntent(context) ?: return
    runCatching {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}

// ── Détection du gestionnaire de démarrage OEM ────────────────────────────────
// Port fidèle de PowerManagerUtils (notifee, dépendance de la v1.3) : liste
// d'activités constructeur, sélectionnées par Build.BRAND, testées via
// queryIntentActivities. ⚠️ Volontairement SANS <queries> dans le manifest
// (comme la v1.3) : sur Android 11+, la visibilité des packages fait échouer la
// résolution → la FixRow « Démarrage automatique » n'apparaît que sur les
// vieux appareils, exactement comme en v1.3. Ne pas « corriger » avant la
// bascule (parité stricte).

private fun componentIntent(pkg: String, cls: String): Intent =
    Intent().setComponent(ComponentName(pkg, cls))

private fun manufacturerPowerManagerIntents(brand: String): List<Intent> = when (brand) {
    "asus" -> listOf(
        componentIntent("com.asus.mobilemanager", "com.asus.mobilemanager.powersaver.PowerSaverSettings"),
        componentIntent("com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity"),
        componentIntent("com.asus.mobilemanager", "com.asus.mobilemanager.entry.FunctionActivity")
            .setData(Uri.parse("mobilemanager://function/entry/AutoStart")),
    )
    "samsung" -> listOf(
        componentIntent("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"),
        componentIntent("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity"),
        componentIntent("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity"),
    )
    "huawei" -> listOf(
        componentIntent("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
        componentIntent("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
        componentIntent("com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"),
    )
    "redmi", "xiaomi" -> listOf(
        componentIntent("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
    )
    "letv" -> listOf(
        componentIntent("com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity")
            .setData(Uri.parse("mobilemanager://function/entry/AutoStart")),
    )
    "honor" -> listOf(
        componentIntent("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
    )
    "coloros", "oppo" -> listOf(
        componentIntent("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
        componentIntent("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
        componentIntent("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")
            .setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS),
        componentIntent("com.coloros.oppoguardelf", "com.coloros.powermanager.fuelgaue.PowerUsageModelActivity"),
        componentIntent("com.coloros.oppoguardelf", "com.coloros.powermanager.fuelgaue.PowerSaverModeActivity"),
        componentIntent("com.coloros.oppoguardelf", "com.coloros.powermanager.fuelgaue.PowerConsumptionActivity"),
    )
    "vivo" -> listOf(
        componentIntent("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
        componentIntent("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
        componentIntent("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"),
    )
    "nokia" -> listOf(
        componentIntent("com.evenwell.powersaving.g3", "com.evenwell.powersaving.g3.exception.PowerSaverExceptionActivity"),
    )
    "oneplus" -> listOf(
        componentIntent("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"),
    )
    "meizu" -> listOf(
        componentIntent("com.meizu.safe", "com.meizu.safe.security.SHOW_APPSEC")
            .addCategory(Intent.CATEGORY_DEFAULT),
    )
    "htc" -> listOf(
        componentIntent("com.htc.pitroad", "com.htc.pitroad.landingpage.activity.LandingPageActivity"),
    )
    else -> emptyList()
}

private fun findPowerManagerIntent(context: Context): Intent? =
    manufacturerPowerManagerIntents(Build.BRAND.lowercase(Locale.US)).firstOrNull { intent ->
        runCatching {
            context.packageManager
                .queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
                .isNotEmpty()
        }.getOrDefault(false)
    }
