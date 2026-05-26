import {useEffect} from 'react';
import BackgroundFetch from 'react-native-background-fetch';
import notifee, {AuthorizationStatus} from '@notifee/react-native';
import {checkAndNotify, initNotificationChannel} from '../services/notificationService';
import {useSettingsStore} from '../stores/useSettingsStore';

/**
 * Hook à appeler une seule fois dans App.tsx.
 *
 * Responsabilités :
 *  - Crée le canal de notifications Android (idempotent).
 *  - Demande la permission de notifier (Android 13+, iOS).
 *  - Configure react-native-background-fetch avec l'intervalle du store.
 *  - Se reconfigure si l'intervalle change dans les settings.
 */
export function useNotificationSetup(): void {
  const checkIntervalMinutes = useSettingsStore(s => s.checkIntervalMinutes);
  const notificationsEnabled = useSettingsStore(s => s.notificationsEnabled);

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
        await checkAndNotify();
        BackgroundFetch.finish(taskId);
      },
      taskId => {
        // Timeout
        BackgroundFetch.finish(taskId);
      },
    );

    // Lancer un check immédiat lors de l'ouverture de l'app (en plus du background)
    checkAndNotify().catch(() => {});
  }, [checkIntervalMinutes, notificationsEnabled]);
}
