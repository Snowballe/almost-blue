/**
 * Vérification de la « fiabilité » de livraison des notifications planifiées
 * (digest quotidien à l'heure pile).
 *
 * Sur Android, tirer une notification à l'heure exacte même app fermée exige
 * plusieurs autorisations système que l'app ne peut pas s'auto-accorder :
 *  - exemption d'optimisation batterie (Doze),
 *  - permission d'alarme exacte (Android 12+),
 *  - parfois un gestionnaire de démarrage OEM (Samsung, Xiaomi, Huawei…).
 *
 * On s'appuie sur les helpers natifs de notifee (déjà dépendance) pour lire
 * l'état et router l'utilisateur vers le bon écran système.
 */
import {Platform} from 'react-native';
import notifee, {AndroidNotificationSetting} from '@notifee/react-native';

export interface ReliabilityStatus {
  /** true = optimisation batterie ACTIVE pour l'app (mauvais : tir différé en Doze). */
  batteryOptimized: boolean;
  /** true = alarmes exactes autorisées (bon). */
  exactAlarmAllowed: boolean;
  /** true = un gestionnaire de démarrage OEM est présent et doit être réglé. */
  needsPowerManager: boolean;
}

/** Statut « tout va bien » par défaut hors Android (iOS/web : pas de Doze). */
const OK: ReliabilityStatus = {
  batteryOptimized: false,
  exactAlarmAllowed: true,
  needsPowerManager: false,
};

/** Lit l'état des trois leviers de fiabilité. Ne déclenche aucune invite. */
export async function getReliabilityStatus(): Promise<ReliabilityStatus> {
  if (Platform.OS !== 'android') return OK;

  const [batteryOptimized, settings, powerManager] = await Promise.all([
    notifee.isBatteryOptimizationEnabled(),
    notifee.getNotificationSettings(),
    notifee.getPowerManagerInfo(),
  ]);

  return {
    batteryOptimized,
    exactAlarmAllowed: settings.android.alarm === AndroidNotificationSetting.ENABLED,
    needsPowerManager: !!powerManager.activity,
  };
}

/** true si la livraison à l'heure pile est fiable (rien à régler de bloquant). */
export function isReliabilityOk(s: ReliabilityStatus): boolean {
  return !s.batteryOptimized && s.exactAlarmAllowed;
}

// ── Routage vers les écrans système ───────────────────────────────────────────
// Wrappers minces autour de notifee pour garder les écrans appelants découplés
// de l'API native et faciliter le mock en test.

export function openBatteryOptimizationSettings(): Promise<void> {
  return notifee.openBatteryOptimizationSettings();
}

export function openAlarmPermissionSettings(): Promise<void> {
  return notifee.openAlarmPermissionSettings();
}

export function openPowerManagerSettings(): Promise<void> {
  return notifee.openPowerManagerSettings();
}
