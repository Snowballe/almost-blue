/**
 * Logique de notifications météo pour Almost Blue.
 *
 * Flux :
 *  1. checkAndNotify() est appelé par la tâche background (react-native-background-fetch).
 *  2. Pour chaque secteur favori, on calcule le meilleur score par orientation.
 *  3. Si un score passe de !good → good par rapport au dernier check → notif.
 *  4. Les nouveaux scores sont persistés dans useNotificationStore.
 */

import notifee, {AndroidImportance, AndroidStyle} from '@notifee/react-native';
import {sectors} from '../data/sectors';
import {useSectorsStore} from '../stores/useSectorsStore';
import {useSettingsStore} from '../stores/useSettingsStore';
import {useNotificationStore} from '../stores/useNotificationStore';
import {getCachedForecast} from './openMeteo';
import {getSubSectorSummary} from '../utils/weatherLogic';
import {isOffSeason} from '../utils/seasonLogic';
import {WeatherForecast, WeatherScore} from '../types/weather';
import {Sector, Orientation} from '../types/sector';
import {ORIENTATION_FR} from '../utils/orientationUtils';

const CHANNEL_ID = 'weather-alerts';

interface GoodOrientation {
  orientation: Orientation;
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
  totalOrientations: number,
): string {
  // Toutes les orientations du secteur sont bonnes
  if (goodOrientations.length === totalOrientations) {
    return `Toutes les faces de ${sector.name} sont sèches !`;
  }

  const faces = goodOrientations.map(
    g => ORIENTATION_FR[g.orientation] ?? g.orientation,
  );
  const subName = goodOrientations[0].subSectorName;

  if (faces.length === 1) {
    return `La face ${faces[0]} de ${sector.name} est sèche. Allez sur ${subName}.`;
  }

  const facesStr =
    faces.slice(0, -1).join(', ') + ' et ' + faces[faces.length - 1];
  return `Les faces ${facesStr} de ${sector.name} sont sèches. Allez sur ${subName}.`;
}

// ── Envoi d'une notification ──────────────────────────────────────────────────

async function sendSectorNotification(
  sector: Sector,
  goodOrientations: GoodOrientation[],
  totalOrientations: number,
): Promise<void> {
  await notifee.displayNotification({
    title: 'Conditions favorables',
    body: buildNotificationBody(sector, goodOrientations, totalOrientations),
    android: {
      channelId: CHANNEL_ID,
      pressAction: {id: 'default'},
    },
    ios: {
      sound: 'default',
    },
  });
}

// ── Notification de test ──────────────────────────────────────────────────────

/**
 * Envoie une notif factice pour vérifier que le canal et les permissions
 * fonctionnent, sans dépendre de la météo ou de la saison.
 */
export async function sendTestNotification(): Promise<void> {
  await initNotificationChannel();
  await notifee.displayNotification({
    title: 'Almost Blue',
    body: 'Les notifications fonctionnent correctement.',
    android: {
      channelId: CHANNEL_ID,
      pressAction: {id: 'default'},
    },
    ios: {sound: 'default'},
  });
}

// ── Vérification principale ───────────────────────────────────────────────────

/**
 * Point d'entrée du background task.
 * Compare les scores actuels aux derniers scores connus et envoie des notifs
 * pour les transitions !good → good sur les secteurs favoris.
 */
export async function checkAndNotify(force = false): Promise<void> {
  // Attendre l'hydratation des stores (important en contexte headless).
  // Promise.allSettled (et non Promise.all) pour qu'un échec d'un store
  // n'annule pas les deux autres — l'app reste fonctionnelle même si
  // AsyncStorage est partiellement corrompu.
  await Promise.allSettled([
    useSettingsStore.persist.rehydrate(),
    useSectorsStore.persist.rehydrate(),
    useNotificationStore.persist.rehydrate(),
  ]);

  const settings = useSettingsStore.getState();
  const {notificationsEnabled, offseasonStart, offseasonEnd, notificationsInSummer} =
    settings;

  if (!force && !notificationsEnabled) return;

  // Respecter la saisonnalité : pas de notifs en été sauf si activé ou forcé
  const offSeason = isOffSeason(new Date(), offseasonStart, offseasonEnd);
  if (!force && !offSeason && !notificationsInSummer) return;

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
      // Cherche le rockType du premier sous-secteur avec cette orientation
      const rockType = sector.subSectors.find(ss => ss.orientation === orientation)?.rockType ?? 'slow';
      const {score} = getSubSectorSummary(forecast, orientation, rockType);
      const wasGood = lastScores[key] === 'good';

      if (score === 'good' && !wasGood) {
        newlyGood.push({orientation, subSectorName});
      }

      newScores[key] = score;
    }

    if (newlyGood.length > 0) {
      await sendSectorNotification(sector, newlyGood, orientationMap.size);
    }
  }

  setScores(newScores);
}

// ── Digest quotidien ──────────────────────────────────────────────────────────

const DIGEST_HORIZON_HOURS = 168; // 7 jours

function todayParis(): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Paris'}).format(new Date());
}

function tomorrowParis(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Paris'}).format(d);
}

/**
 * Formate la disponibilité d'une fenêtre météo favorable pour le digest.
 * Ex : "grimpable aujourd'hui !", "dans 3 jours (mercredi)", "aucune fenêtre cette semaine"
 */
export function formatNextWindow(
  nextGoodWindow: {date: string; startHour: number; endHour: number} | null,
): string {
  if (!nextGoodWindow) {
    return 'aucune fenêtre cette semaine';
  }

  const today    = todayParis();
  const tomorrow = tomorrowParis();

  if (nextGoodWindow.date === today)    return "grimpable aujourd'hui !";
  if (nextGoodWindow.date === tomorrow) return 'grimpable demain';

  const todayMs  = new Date(today    + 'T12:00:00Z').getTime();
  const windowMs = new Date(nextGoodWindow.date + 'T12:00:00Z').getTime();
  const diffDays = Math.round((windowMs - todayMs) / 86_400_000);

  const weekday = new Date(nextGoodWindow.date + 'T12:00:00Z')
    .toLocaleDateString('fr-FR', {weekday: 'long'});

  return `dans ${diffDays} jours (${weekday})`;
}

/**
 * Construit les lignes du digest à partir des forecasts déjà fetchés.
 * Une ligne par secteur, orientation la plus favorable sur 7 jours.
 */
export function buildDigestLines(
  favSectors: Sector[],
  forecasts: Map<string, WeatherForecast>,
): string[] {
  const lines: string[] = [];

  for (const sector of favSectors) {
    const forecast = forecasts.get(sector.id);
    if (!forecast) continue;

    // Dédupliquer les orientations, garder le premier sous-secteur représentatif
    const orientationMap = new Map<Orientation, string>();
    for (const ss of sector.subSectors) {
      if (!orientationMap.has(ss.orientation)) {
        orientationMap.set(ss.orientation, ss.name);
      }
    }
    if (orientationMap.size === 0) continue;

    // Choisir l'orientation avec le meilleur score numérique sur 7 jours
    let bestScore = -1;
    let bestOrientation: Orientation | null = null;
    let bestWindow: {date: string; startHour: number; endHour: number} | null = null;

    for (const [orientation] of orientationMap) {
      const rockType =
        sector.subSectors.find(ss => ss.orientation === orientation)?.rockType ?? 'slow';
      const summary = getSubSectorSummary(forecast, orientation, rockType, DIGEST_HORIZON_HOURS);
      if (summary.numericScore > bestScore) {
        bestScore       = summary.numericScore;
        bestOrientation = orientation;
        bestWindow      = summary.nextGoodWindow;
      }
    }

    if (!bestOrientation) continue;

    const faceLabel = ORIENTATION_FR[bestOrientation] ?? bestOrientation;
    const status    = formatNextWindow(bestWindow);
    lines.push(`${sector.name} — Face ${faceLabel} : ${status}`);
  }

  return lines;
}

/**
 * Envoie la notification de digest quotidien.
 * Guards : notificationsEnabled, digestEnabled, et lastDigestDate (anti-doublon).
 * Passer force=true pour bypasser lastDigestDate (bouton debug).
 */
export async function sendDailyDigest(force = false): Promise<void> {
  await Promise.allSettled([
    useSettingsStore.persist.rehydrate(),
    useSectorsStore.persist.rehydrate(),
    useNotificationStore.persist.rehydrate(),
  ]);

  const {notificationsEnabled, digestEnabled} = useSettingsStore.getState();
  if (!notificationsEnabled || !digestEnabled) return;

  const {favoriteIds} = useSectorsStore.getState();
  if (favoriteIds.length === 0) return;

  const {lastDigestDate, setLastDigestDate} = useNotificationStore.getState();
  const today = todayParis();
  if (!force && lastDigestDate === today) return;

  const favSectors = sectors.filter(s => favoriteIds.includes(s.id));
  const forecasts  = new Map<string, WeatherForecast>();

  for (const sector of favSectors) {
    try {
      forecasts.set(sector.id, await getCachedForecast(sector.latitude, sector.longitude));
    } catch {
      // Erreur réseau → ce secteur sera absent de la map, buildDigestLines le skipera
    }
  }

  const lines = buildDigestLines(favSectors, forecasts);
  if (lines.length === 0) return;

  const dateStr = new Intl.DateTimeFormat('fr-FR', {
    day:   '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(new Date());

  const body = lines.join('\n');

  await notifee.displayNotification({
    title: `Résumé grimpe · ${dateStr}`,
    body,
    android: {
      channelId: CHANNEL_ID,
      pressAction: {id: 'default'},
      style: {type: AndroidStyle.BIGTEXT, text: body},
    },
    ios: {sound: 'default'},
  });

  setLastDigestDate(today);
}
