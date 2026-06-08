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

import notifee from '@notifee/react-native';
import {checkAndNotify} from '../../src/services/notificationService';
import {useSectorsStore} from '../../src/stores/useSectorsStore';
import {useSettingsStore} from '../../src/stores/useSettingsStore';
import {useNotificationStore} from '../../src/stores/useNotificationStore';
import {getCachedForecast} from '../../src/services/openMeteo';
import {getSubSectorSummary} from '../../src/utils/weatherLogic';
import {OFFSEASON_START, OFFSEASON_END} from '../../src/utils/seasonLogic';

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
  });
  useSectorsStore.setState({favoriteIds: ['buoux']});
  useNotificationStore.setState({lastScores: {}});

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
    mockGetSubSectorSummary.mockReturnValue({score: 'good', numericScore: 8, nextGoodWindow: null});
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
        ? {score: 'good', numericScore: 8, nextGoodWindow: null}
        : {score: 'bad',  numericScore: 2, nextGoodWindow: null},
    );
    await checkAndNotify();
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    expect(mockDisplayNotification.mock.calls[0][0].title).toBe('Conditions favorables');
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
    mockGetSubSectorSummary.mockReturnValue({score: 'good', numericScore: 8, nextGoodWindow: null});
    await checkAndNotify(true);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });
});

// ─── corps du message de notification ────────────────────────────────────────
// Buoux : orientations dédupliquées S (Le Toit) + SE (La Dalle) — 2 orientations

describe('corps du message', () => {
  it('une seule orientation good → "La face X de … est sèche"', async () => {
    // S passe de bad à good ; SE reste bad
    useNotificationStore.setState({lastScores: {'buoux:SE': 'good'}});
    mockGetSubSectorSummary.mockImplementation((_f: unknown, orientation: string) =>
      orientation === 'S'
        ? {score: 'good', numericScore: 8, nextGoodWindow: null}
        : {score: 'good', numericScore: 8, nextGoodWindow: null}, // SE déjà good → pas de transition
    );
    // SE était good → no transition ; seul S transite
    useNotificationStore.setState({lastScores: {'buoux:SE': 'good', 'buoux:S': 'bad'}});
    await checkAndNotify();
    const body: string = mockDisplayNotification.mock.calls[0][0].body;
    expect(body).toMatch(/^La face Sud de Falaise de Buoux est sèche/);
    expect(body).toContain('Le Toit');
  });

  it('deux orientations good sur trois → "Les faces X et Y de … sont sèches"', async () => {
    // verdon-escalès : 3 orientations uniques — S (Luna Bong), E (Dalle du Fond), N (Rive Gauche)
    // S et E passent à good, N reste bad → goodOrientations.length (2) !== totalOrientations (3)
    useSectorsStore.setState({favoriteIds: ['verdon-escalès']});
    useNotificationStore.setState({lastScores: {}});
    mockGetSubSectorSummary.mockImplementation((_f: unknown, orientation: string) =>
      orientation === 'N'
        ? {score: 'bad',  numericScore: 2, nextGoodWindow: null}
        : {score: 'good', numericScore: 8, nextGoodWindow: null},
    );
    await checkAndNotify();
    const body: string = mockDisplayNotification.mock.calls[0][0].body;
    expect(body).toMatch(/Les faces.*et.*sont sèches/);
    expect(body).toContain('Verdon');
  });

  it('toutes les orientations good → "Toutes les faces de …"', async () => {
    // verdon-escalès : les 3 orientations transitent toutes → goodOrientations.length === 3
    useSectorsStore.setState({favoriteIds: ['verdon-escalès']});
    useNotificationStore.setState({lastScores: {}});
    mockGetSubSectorSummary.mockReturnValue({score: 'good', numericScore: 8, nextGoodWindow: null});
    await checkAndNotify();
    const body: string = mockDisplayNotification.mock.calls[0][0].body;
    expect(body).toBe('Toutes les faces de Verdon — Escalès sont sèches !');
  });
});
