/**
 * Tests de checkAndNotify() — logique de détection de transitions météo et
 * construction des messages de notification.
 *
 * Stratégie :
 *  - getCachedForecast et getSubSectorSummary sont mockés pour contrôler les scores
 *  - Les stores sont initialisés directement via setState() avant chaque test
 *  - Le mock AsyncStorage fait que persist.rehydrate() ne surcharge pas l'état
 *  - On utilise le secteur 'buoux' (orientations dédupliquées S + SE) comme fixture
 */

jest.mock('../../src/services/openMeteo', () => ({
  getCachedForecast: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../src/utils/weatherLogic', () => ({
  getSubSectorSummary: jest.fn(() => ({score: 'bad', numericScore: 2, nextGoodWindow: null})),
}));

import notifee, {AndroidStyle} from '@notifee/react-native';
import BackgroundFetch from 'react-native-background-fetch';
import {
  checkAndNotify,
  formatNextWindow,
  buildDigestLines,
  sendDailyDigest,
  scheduleNextDigest,
} from '../../src/services/notificationService';
import {useSectorsStore} from '../../src/stores/useSectorsStore';
import {useSettingsStore} from '../../src/stores/useSettingsStore';
import {useNotificationStore} from '../../src/stores/useNotificationStore';
import {getCachedForecast} from '../../src/services/openMeteo';
import {getSubSectorSummary} from '../../src/utils/weatherLogic';
import {OFFSEASON_START, OFFSEASON_END} from '../../src/utils/seasonLogic';
import type {Sector} from '../../src/types/sector';
import type {WeatherForecast} from '../../src/types/weather';

const mockGetCachedForecast  = getCachedForecast  as jest.Mock;
const mockGetSubSectorSummary = getSubSectorSummary as jest.Mock;
const mockDisplayNotification = notifee.displayNotification as jest.Mock;

// Paramètres d'un jour de hors-saison (décembre → isOffSeason = true)
const WINTER_DATE = new Date('2026-12-15T10:00:00Z');

// Réinitialise les stores dans un état "hors-saison actif, buoux en favori"
function setupDefaults(): void {
  jest.useFakeTimers();
  jest.setSystemTime(WINTER_DATE);

  useSettingsStore.setState({
    notificationsEnabled:  true,
    checkIntervalMinutes:  180,
    notificationsInSummer: false,
    hibernationEnabled:    true,
    colorScheme:           'dark',
    offseasonStart:        OFFSEASON_START,
    offseasonEnd:          OFFSEASON_END,
    overrideHibernation:   false,
    digestEnabled:         true,
    digestHour:            10,
  });
  useSectorsStore.setState({favoriteIds: ['buoux']});
  useNotificationStore.setState({lastScores: {}, lastDigestDate: null, lastDigestSummary: null});

  // Par défaut : retourne 'bad' pour toutes les orientations
  mockGetSubSectorSummary.mockReturnValue({score: 'bad', numericScore: 2, nextGoodWindow: null});
  mockGetCachedForecast.mockResolvedValue({});
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaults();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── gardes d'entrée ──────────────────────────────────────────────────────────

describe("gardes d'entrée", () => {
  it('ne notifie pas si notificationsEnabled=false', async () => {
    useSettingsStore.setState({notificationsEnabled: false});
    await checkAndNotify();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('ne notifie pas si favoriteIds est vide', async () => {
    useSectorsStore.setState({favoriteIds: []});
    await checkAndNotify();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('ne notifie pas en été si notificationsInSummer=false', async () => {
    jest.setSystemTime(new Date('2026-07-15T10:00:00Z')); // été
    useSettingsStore.setState({notificationsInSummer: false});
    useSectorsStore.setState({favoriteIds: ['buoux']});
    await checkAndNotify();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('notifie en été si notificationsInSummer=true', async () => {
    jest.setSystemTime(new Date('2026-07-15T10:00:00Z'));
    useSettingsStore.setState({notificationsInSummer: true});
    mockGetSubSectorSummary.mockReturnValue({
      score: 'good', numericScore: 8,
      nextGoodWindow: {date: '2026-07-15', startHour: 10, endHour: 18},
    });
    await checkAndNotify();
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('ignore un secteur si getCachedForecast rejette (erreur réseau)', async () => {
    mockGetCachedForecast.mockRejectedValue(new Error('réseau'));
    await expect(checkAndNotify()).resolves.toBeUndefined(); // pas de crash
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });
});

// ─── détection de transition ─────────────────────────────────────────────────

describe('détection de transition bad → good', () => {
  it('envoie une notif quand un score passe de bad à good', async () => {
    useNotificationStore.setState({lastScores: {'buoux:S': 'bad'}});
    mockGetSubSectorSummary.mockImplementation((_f: unknown, orientation: string) =>
      orientation === 'S'
        ? {score: 'good', numericScore: 8, nextGoodWindow: {date: '2026-12-15', startHour: 10, endHour: 18}}
        : {score: 'bad',  numericScore: 2, nextGoodWindow: null},
    );
    await checkAndNotify();
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const title: string = mockDisplayNotification.mock.calls[0][0].title;
    expect(title).toContain('Falaise de Buoux');
    expect(title).toContain("grimpable aujourd'hui !");
  });

  it("ne notifie pas si toutes les orientations étaient déjà good (pas de transition)", async () => {
    // buoux a S + SE : les deux étaient déjà good → aucune transition
    useNotificationStore.setState({lastScores: {'buoux:S': 'good', 'buoux:SE': 'good'}});
    mockGetSubSectorSummary.mockReturnValue({score: 'good', numericScore: 8, nextGoodWindow: null});
    await checkAndNotify();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('force=true déclenche même si notificationsEnabled=false', async () => {
    useSettingsStore.setState({notificationsEnabled: false});
    mockGetSubSectorSummary.mockReturnValue({
      score: 'good', numericScore: 8,
      nextGoodWindow: {date: '2026-12-15', startHour: 10, endHour: 18},
    });
    await checkAndNotify(true);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });
});

// ─── corps du message de notification ────────────────────────────────────────
// Buoux : orientations dédupliquées S (Le Toit) + SE (La Dalle) — 2 orientations

describe('corps du message', () => {
  it('une seule orientation good → "La face X est sèche" (sector name dans le titre)', async () => {
    useNotificationStore.setState({lastScores: {'buoux:SE': 'good', 'buoux:S': 'bad'}});
    mockGetSubSectorSummary.mockImplementation((_f: unknown, orientation: string) =>
      orientation === 'S'
        ? {score: 'good', numericScore: 8, nextGoodWindow: {date: '2026-12-15', startHour: 10, endHour: 18}}
        : {score: 'good', numericScore: 8, nextGoodWindow: null}, // SE déjà good → pas de transition
    );
    await checkAndNotify();
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('Falaise de Buoux');
    expect(call.body).toMatch(/^La face Sud est sèche/);
    expect(call.body).toContain('Le Toit');
  });

  it('deux orientations good sur trois → "Les faces X et Y sont sèches"', async () => {
    // verdon-escalès : 3 orientations uniques — S (Luna Bong), E (Dalle du Fond), N (Rive Gauche)
    useSectorsStore.setState({favoriteIds: ['verdon-escalès']});
    useNotificationStore.setState({lastScores: {}});
    mockGetSubSectorSummary.mockImplementation((_f: unknown, orientation: string) =>
      orientation === 'N'
        ? {score: 'bad',  numericScore: 2, nextGoodWindow: null}
        : {score: 'good', numericScore: 8, nextGoodWindow: {date: '2026-12-15', startHour: 10, endHour: 18}},
    );
    await checkAndNotify();
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('Verdon');
    expect(call.body).toMatch(/Les faces.*et.*sont sèches/);
    expect(call.body).not.toContain('Verdon');
  });

  it('toutes les orientations good → "Toutes les faces sont sèches !" (sector name dans le titre)', async () => {
    // verdon-escalès : les 3 orientations transitent toutes → goodOrientations.length === 3
    useSectorsStore.setState({favoriteIds: ['verdon-escalès']});
    useNotificationStore.setState({lastScores: {}});
    mockGetSubSectorSummary.mockReturnValue({
      score: 'good', numericScore: 8,
      nextGoodWindow: {date: '2026-12-15', startHour: 10, endHour: 18},
    });
    await checkAndNotify();
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('Verdon');
    expect(call.body).toBe('Toutes les faces sont sèches !');
  });
});

// ─── formatNextWindow ─────────────────────────────────────────────────────────
// Fake timers fixés à 2026-12-15T10:00:00Z (Paris = UTC+1 → 11h00)
// todayParis = "2026-12-15", tomorrowParis = "2026-12-16"

describe('formatNextWindow', () => {
  it('retourne "aucune fenêtre cette semaine" si nextGoodWindow est null', () => {
    expect(formatNextWindow(null)).toBe('aucune fenêtre cette semaine');
  });

  it('retourne "grimpable aujourd\'hui !" si la date est aujourd\'hui', () => {
    expect(formatNextWindow({date: '2026-12-15', startHour: 10, endHour: 18}))
      .toBe("grimpable aujourd'hui !");
  });

  it('retourne "grimpable demain" si la date est demain', () => {
    expect(formatNextWindow({date: '2026-12-16', startHour: 9, endHour: 17}))
      .toBe('grimpable demain');
  });

  it('retourne "dans N jours (weekday)" pour une date à J+3', () => {
    // 2026-12-18 = vendredi
    expect(formatNextWindow({date: '2026-12-18', startHour: 10, endHour: 18}))
      .toMatch(/^dans 3 jours \(.+\)$/);
  });

  it('retourne "dans 7 jours (weekday)" pour une date en limite de la fenêtre', () => {
    expect(formatNextWindow({date: '2026-12-22', startHour: 10, endHour: 18}))
      .toMatch(/^dans 7 jours \(.+\)$/);
  });
});

// ─── buildDigestLines ─────────────────────────────────────────────────────────

// Fixtures secteurs minimalistes
const SECTOR_SINGLE: Sector = {
  id: 'test-single',
  name: 'Falaise Test',
  latitude: 44,
  longitude: 5,
  subSectors: [{id: 'ss1', name: 'Face Sud', orientation: 'S', rockType: 'slow'}],
};

const SECTOR_MULTI: Sector = {
  id: 'test-multi',
  name: 'Falaise Multi',
  latitude: 44,
  longitude: 5,
  subSectors: [
    {id: 'ss1', name: 'Face Sud',  orientation: 'S', rockType: 'slow'},
    {id: 'ss2', name: 'Face Ouest', orientation: 'W', rockType: 'slow'},
  ],
};

const EMPTY_FORECAST: WeatherForecast = {slots: [], source: 'open-meteo', fetchedAt: ''};

describe('buildDigestLines', () => {
  it('retourne un tableau vide si aucun secteur n\'est présent dans la map forecasts', () => {
    const lines = buildDigestLines([SECTOR_SINGLE], new Map());
    expect(lines).toEqual([]);
  });

  it('génère une ligne par secteur présent dans la map', () => {
    const forecasts = new Map<string, WeatherForecast>([['test-single', EMPTY_FORECAST]]);
    const lines = buildDigestLines([SECTOR_SINGLE], forecasts);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Falaise Test');
    expect(lines[0]).toContain('Face Sud');
  });

  it('affiche "aucune fenêtre cette semaine" si nextGoodWindow est null', () => {
    mockGetSubSectorSummary.mockReturnValue({score: 'bad', numericScore: 2, nextGoodWindow: null});
    const forecasts = new Map<string, WeatherForecast>([['test-single', EMPTY_FORECAST]]);
    const lines = buildDigestLines([SECTOR_SINGLE], forecasts);
    expect(lines[0]).toContain('aucune fenêtre cette semaine');
  });

  it('choisit l\'orientation avec le meilleur score numérique', () => {
    mockGetSubSectorSummary.mockImplementation((_f: unknown, orientation: string) =>
      orientation === 'W'
        ? {score: 'good', numericScore: 8, nextGoodWindow: {date: '2026-12-15', startHour: 10, endHour: 18}}
        : {score: 'bad',  numericScore: 2, nextGoodWindow: null},
    );
    const forecasts = new Map<string, WeatherForecast>([['test-multi', EMPTY_FORECAST]]);
    const lines = buildDigestLines([SECTOR_MULTI], forecasts);
    expect(lines[0]).toContain('Ouest');
    expect(lines[0]).not.toContain('Sud');
  });

  it('saute un secteur absent de la map forecasts', () => {
    const forecasts = new Map<string, WeatherForecast>([['test-single', EMPTY_FORECAST]]);
    const lines = buildDigestLines([SECTOR_SINGLE, SECTOR_MULTI], forecasts);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Falaise Test');
  });
});

// ─── sendDailyDigest ──────────────────────────────────────────────────────────

describe('sendDailyDigest — gardes d\'entrée', () => {
  it('ne notifie pas si notificationsEnabled=false', async () => {
    useSettingsStore.setState({notificationsEnabled: false});
    await sendDailyDigest();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('ne notifie pas si digestEnabled=false', async () => {
    useSettingsStore.setState({digestEnabled: false});
    await sendDailyDigest();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('ne notifie pas si favoriteIds est vide', async () => {
    useSectorsStore.setState({favoriteIds: []});
    await sendDailyDigest();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('ne notifie pas si lastDigestSummary est identique au contenu actuel', async () => {
    const sameBody = 'Falaise de Buoux — Face Sud : aucune fenêtre cette semaine';
    useNotificationStore.setState({lastScores: {}, lastDigestDate: null, lastDigestSummary: sameBody});
    await sendDailyDigest();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('notifie si lastDigestSummary est différent du contenu actuel', async () => {
    useNotificationStore.setState({lastScores: {}, lastDigestDate: null, lastDigestSummary: 'ancien contenu'});
    await sendDailyDigest();
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('ne notifie pas si lastDigestDate correspond à aujourd\'hui (garde anti-doublon intra-journalier)', async () => {
    // todayParis avec WINTER_DATE = 2026-12-15T10:00Z → Paris = "2026-12-15"
    useNotificationStore.setState({lastScores: {}, lastDigestDate: '2026-12-15', lastDigestSummary: null});
    await sendDailyDigest();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('force=true bypasse lastDigestSummary et lastDigestDate', async () => {
    const sameBody = 'Falaise de Buoux — Face Sud : aucune fenêtre cette semaine';
    useNotificationStore.setState({lastScores: {}, lastDigestDate: '2026-12-15', lastDigestSummary: sameBody});
    await sendDailyDigest(true);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('ne notifie pas si tous les fetches échouent (aucune ligne produite)', async () => {
    mockGetCachedForecast.mockRejectedValue(new Error('réseau'));
    await expect(sendDailyDigest()).resolves.toBeUndefined();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });
});

describe('sendDailyDigest — envoi nominal', () => {
  it('envoie exactement une notification groupée', async () => {
    await sendDailyDigest();
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('le titre contient "Résumé grimpe"', async () => {
    await sendDailyDigest();
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toMatch(/^Résumé grimpe/);
  });

  it('utilise le style BigText Android', async () => {
    await sendDailyDigest();
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.android.style.type).toBe(AndroidStyle.BIGTEXT);
  });

  it('met à jour lastDigestDate après l\'envoi', async () => {
    await sendDailyDigest();
    expect(useNotificationStore.getState().lastDigestDate).toBe('2026-12-15');
  });

  it('met à jour lastDigestSummary après l\'envoi', async () => {
    await sendDailyDigest();
    expect(useNotificationStore.getState().lastDigestSummary).toBe(
      'Falaise de Buoux — Face Sud : aucune fenêtre cette semaine',
    );
  });

  it('le corps du message mentionne le secteur favori', async () => {
    await sendDailyDigest();
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.body).toContain('Falaise de Buoux');
  });
});

// ─── scheduleNextDigest ───────────────────────────────────────────────────────

describe('scheduleNextDigest', () => {
  const mockScheduleTask = BackgroundFetch.scheduleTask as jest.Mock;

  it('planifie la tâche digest en forçant l\'AlarmManager (tir à l\'heure pile)', () => {
    scheduleNextDigest();
    expect(mockScheduleTask).toHaveBeenCalledTimes(1);
    const config = mockScheduleTask.mock.calls[0][0];
    expect(config.taskId).toBe('daily-digest');
    expect(config.forceAlarmManager).toBe(true);
    expect(config.periodic).toBe(false);
    expect(config.delay).toBeGreaterThan(0);
  });

  it('ne planifie rien si notificationsEnabled=false', () => {
    useSettingsStore.setState({notificationsEnabled: false});
    scheduleNextDigest();
    expect(mockScheduleTask).not.toHaveBeenCalled();
  });

  it('ne planifie rien si digestEnabled=false', () => {
    useSettingsStore.setState({digestEnabled: false});
    scheduleNextDigest();
    expect(mockScheduleTask).not.toHaveBeenCalled();
  });
});
