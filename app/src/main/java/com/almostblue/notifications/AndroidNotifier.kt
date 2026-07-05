package com.almostblue.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.almostblue.R
import java.util.concurrent.atomic.AtomicInteger

/**
 * Implémentation NotificationManager du canal `weather-alerts` — remplace notifee.
 * Canal, importance et textes identiques à la v1.3.
 */

const val CHANNEL_ID = "weather-alerts"
private const val DIGEST_NOTIFICATION_ID = 1

/** Crée le canal de notifications (idempotent). À appeler au démarrage de l'app. */
fun initNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
        CHANNEL_ID,
        "Alertes météo",
        NotificationManager.IMPORTANCE_HIGH,
    ).apply {
        description =
            "Notifie quand les conditions de grimpe sont favorables sur vos secteurs favoris."
    }
    context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
}

class AndroidNotifier(private val context: Context) : Notifier {

    // Les alertes secteur ne s'écrasent pas entre elles ; le digest garde un ID
    // fixe (une seule notification de résumé, remplacée chaque jour).
    private val nextAlertId = AtomicInteger(100)

    override fun display(notification: AppNotification) {
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(notification.title)
            .setContentText(notification.body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        if (notification.bigText) {
            builder.setStyle(NotificationCompat.BigTextStyle().bigText(notification.body))
        }

        val id = if (notification.bigText) DIGEST_NOTIFICATION_ID else nextAlertId.getAndIncrement()
        try {
            NotificationManagerCompat.from(context).notify(id, builder.build())
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS refusée → on respecte le choix de l'utilisateur.
        }
    }
}

/** Notif factice pour vérifier canal + permissions, sans dépendre de la météo. */
fun sendTestNotification(context: Context) {
    initNotificationChannel(context)
    AndroidNotifier(context).display(
        AppNotification(
            title = "Almost Blue",
            body = "Les notifications fonctionnent correctement.",
        ),
    )
}
