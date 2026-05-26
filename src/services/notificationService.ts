/**
 * Logique de notifications météo pour Almost Blue.
 *
 * Flux :
 *  1. checkAndNotify() est appelé par la tâche background (react-native-background-fetch).
 *  2. Pour chaque secteur favori, on calcule le meilleur score par orientation.
 *  3. Si un score passe de !good → good par rapport au dernier check → notif.
 *  4. Les nouveaux scores sont persistés dans useNotificationStore.
 */

import notifee, {AndroidImportance} from '@notifee/react-native';
import {sectors} from '../data/sectors';
import {useSectorsStore} from '../stores/useSectorsStore';
import {useSettingsStore} from '../stores/useSettingsStore';
import {useNotificationStore} from '../stores/useNotificationStore';
import {getCachedForecast} from './openMeteo';
import {getSubSectorSummary} from '../utils/weatherLogic';
import {isOffSeason} from '../utils/seasonLogic';
import {WeatherScore} from '../types/weather';
import {Sector, Orientation} from '../types/sector';

const CHANNEL_ID = 'weather-alerts';

const ORIENTATION_FR: Record<string, string> = {
  N: 'Nord', NE: 'Nord-Est', E: 'Est',  SE: 'Sud-Est',
  S: 'Sud',  SW: 'Sud-Ouest', W: 'Ouest', NW: 'Nord-Ouest',
};

interface GoodOrientation {
  orientation: string;
  /** Nom du premier sous-secteur représentatif de cette orientation. */
  subSectorName: string;
}

// ── Canal Android ─────────────────────────────────────────────────────────────

/**
 * Crée le canal de notifications (idempotent — sans effet si déjà existant).
 * Doit être appelé au démarrage de l'app.
 */
export async function initNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Alertes météo',
    importance: AndroidImportance.HIGH,
    description: 'Notifie quand les conditions de grimpe sont favorables sur vos secteurs favoris.',
  });
}

// ── Construction du message ───────────────────────────────────────────────────

function buildNotificationBody(
  sector: Sector,
  goodOrientations: GoodOrientation[],
): string {
  const faces = goodOrientations.map(
    g => ORIENTATION_FR[g.orientation] ?? g.orientation,
  );
  const subName = goodOrientations[0].subSectorName;

  if (faces.length === 1) {
    return `La face ${faces[0]} de ${sector.name} est sèche ! Vous pouvez aller sur ${subName}.`;
  }

  // Plusieurs orientations : "La face Est, Sud et Ouest de X sont sèches !"
  const facesStr =
    faces.slice(0, -1).join(', ') + ' et ' + faces[faces.length - 1];
  return `Les faces ${facesStr} de ${sector.name} sont sèches ! Vous pouvez aller sur ${subName}.`;
}

// ── Envoi d'une notification ──────────────────────────────────────────────────

async function sendSectorNotification(
  sector: Sector,
  goodOrientations: GoodOrientation[],
): Promise<void> {
  await notifee.displayNotification({
    title: 'Conditions favorables 🧗',
    body: buildNotificationBody(sector, goodOrientations),
    android: {
      channelId: CHANNEL_ID,
      pressAction: {id: 'default'},
      // smallIcon utilise le lanceur de l'app par défaut
    },
    ios: {
      sound: 'default',
    },
  });
}

// ── Vérification principale ───────────────────────────────────────────────────

/**
 * Point d'entrée du background task.
 * Compare les scores actuels aux derniers scores connus et envoie des notifs
 * pour les transitions !good → good sur les secteurs favoris.
 */
export async function checkAndNotify(): Promise<void> {
  // Attendre l'hydratation des stores (important en contexte headless)
  await Promise.all([
    useSettingsStore.persist.rehydrate(),
    useSectorsStore.persist.rehydrate(),
    useNotificationStore.persist.rehydrate(),
  ]);

  const settings = useSettingsStore.getState();
  const {notificationsEnabled, offseasonStart, offseasonEnd, notificationsInSummer} =
    settings;

  if (!notificationsEnabled) return;

  // Respecter la saisonnalité : pas de notifs en été sauf si activé
  const offSeason = isOffSeason(new Date(), offseasonStart, offseasonEnd);
  if (!offSeason && !notificationsInSummer) return;

  const {favoriteIds} = useSectorsStore.getState();
  if (favoriteIds.length === 0) return;

  const {lastScores, setScores} = useNotificationStore.getState();
  const newScores: Record<string, WeatherScore> = {...lastScores};

  const favSectors = sectors.filter(s => favoriteIds.includes(s.id));

  for (const sector of favSectors) {
    let forecast;
    try {
      forecast = await getCachedForecast(sector.latitude, sector.longitude);
    } catch {
      continue; // Erreur réseau → on skip ce secteur
    }

    // Dédupliquer les orientations tout en gardant le premier sous-secteur représentatif
    const orientationMap = new Map<Orientation, string>(); // orientation → subSectorName
    for (const ss of sector.subSectors) {
      if (!orientationMap.has(ss.orientation)) {
        orientationMap.set(ss.orientation, ss.name);
      }
    }

    const newlyGood: GoodOrientation[] = [];

    for (const [orientation, subSectorName] of orientationMap) {
      const key = `${sector.id}:${orientation}`;
      const {score} = getSubSectorSummary(forecast, orientation);
      const wasGood = lastScores[key] === 'good';

      if (score === 'good' && !wasGood) {
        newlyGood.push({orientation, subSectorName});
      }

      newScores[key] = score;
    }

    if (newlyGood.length > 0) {
      await sendSectorNotification(sector, newlyGood);
    }
  }

  setScores(newScores);
}
