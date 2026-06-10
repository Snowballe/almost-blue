import {useEffect, useRef} from 'react';
import BackgroundFetch from 'react-native-background-fetch';
import notifee, {AuthorizationStatus} from '@notifee/react-native';
import {
  checkAndNotify,
  initNotificationChannel,
  sendDailyDigest,
  scheduleNextDigest,
  DIGEST_TASK_ID,
} from '../services/notificationService';
import {useSettingsStore} from '../stores/useSettingsStore';

/**
 * Hook à appeler une seule fois dans App.tsx.
 *
 * Responsabilités :
 *  - Crée le canal de notifications Android (idempotent).
 *  - Demande la permission de notifier (Android 13+, iOS).
 *  - Configure react-native-background-fetch avec l'intervalle du store.
 *  - Se reconfigure si l'intervalle change dans les settings.
 *  - Planifie le digest quotidien à 10h.
 */
export function useNotificationSetup(): void {
  const checkIntervalMinutes = useSettingsStore(s => s.checkIntervalMinutes);
  const notificationsEnabled = useSettingsStore(s => s.notificationsEnabled);
  const digestEnabled        = useSettingsStore(s => s.digestEnabled);
  const digestHour           = useSettingsStore(s => s.digestHour);

  // Guard contre les appels concurrents à checkAndNotify.
  // Sans ce verrou, un changement rapide de settings (ou un re-rendu)
  // pourrait accumuler plusieurs checks simultanés en mémoire.
  const checkInProgress = useRef(false);

  // Initialisation unique : canal + permission
  useEffect(() => {
    async function init() {
      await initNotificationChannel();

      const settings = await notifee.requestPermission();
      // On ne force rien — si l'utilisateur refuse, on respecte son choix.
      if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
        return;
      }
    }
    init();
  }, []);

  // (Re-)configure background-fetch quand l'intervalle ou l'activation change
  useEffect(() => {
    if (!notificationsEnabled) {
      BackgroundFetch.stop();
      return;
    }

    BackgroundFetch.configure(
      {
        minimumFetchInterval: checkIntervalMinutes,
        stopOnTerminate: false,
        enableHeadless: true,
        startOnBoot: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      async taskId => {
        if (taskId === DIGEST_TASK_ID) {
          await sendDailyDigest();
          const s = useSettingsStore.getState();
          if (s.notificationsEnabled && s.digestEnabled) {
            scheduleNextDigest();
          }
        } else {
          await checkAndNotify();
        }
        BackgroundFetch.finish(taskId);
      },
      taskId => {
        // Timeout
        BackgroundFetch.finish(taskId);
      },
    );

    if (digestEnabled) {
      scheduleNextDigest();
    }

    // Lancer un check immédiat lors de l'ouverture de l'app (en plus du background).
    // Différé de 4s pour ne pas concurrencer la rehydration des stores et les
    // requêtes réseau de MapScreen au démarrage. La fenêtre météo ne change pas
    // en 4 secondes ; le background fetch reprend de toute façon selon l'intervalle.
    // Le verrou checkInProgress évite d'empiler plusieurs checks si l'effet
    // se re-déclenche (changement de settings) avant que le précédent soit fini.
    async function runImmediateCheck() {
      if (checkInProgress.current) {
        return;
      }
      checkInProgress.current = true;
      try {
        await checkAndNotify();
      } catch {
        // Erreur réseau ou autre → on ignore silencieusement,
        // le background fetch réessaiera selon l'intervalle configuré.
      } finally {
        checkInProgress.current = false;
      }
    }
    const timer = setTimeout(runImmediateCheck, 4000);
    return () => clearTimeout(timer);
  }, [checkIntervalMinutes, notificationsEnabled, digestEnabled, digestHour]);

  // (Re-)planifie ou laisse expirer le digest quand le toggle ou l'heure change
  useEffect(() => {
    if (notificationsEnabled && digestEnabled) {
      scheduleNextDigest();
    }
    // Pas de cleanup : quand désactivé, sendDailyDigest() retourne en early-return
    // et ne replanifie pas → la tâche s'éteint d'elle-même après son prochain fire.
  }, [digestEnabled, notificationsEnabled, digestHour]);
}
