import {useSettingsStore} from '../../src/stores/useSettingsStore';
import {OFFSEASON_START, OFFSEASON_END} from '../../src/utils/seasonLogic';

beforeEach(() => {
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
});

// ─── état initial ─────────────────────────────────────────────────────────────

describe('état initial', () => {
  it('notifications activées par défaut', () => {
    expect(useSettingsStore.getState().notificationsEnabled).toBe(true);
  });

  it('intervalle de vérification 3h par défaut', () => {
    expect(useSettingsStore.getState().checkIntervalMinutes).toBe(180);
  });

  it('notifications en été désactivées par défaut', () => {
    expect(useSettingsStore.getState().notificationsInSummer).toBe(false);
  });

  it('hibernation activée par défaut', () => {
    expect(useSettingsStore.getState().hibernationEnabled).toBe(true);
  });

  it('thème sombre par défaut', () => {
    expect(useSettingsStore.getState().colorScheme).toBe('dark');
  });

  it('dates hors-saison aux valeurs par défaut', () => {
    expect(useSettingsStore.getState().offseasonStart).toEqual(OFFSEASON_START);
    expect(useSettingsStore.getState().offseasonEnd).toEqual(OFFSEASON_END);
  });

  it('overrideHibernation désactivé par défaut', () => {
    expect(useSettingsStore.getState().overrideHibernation).toBe(false);
  });

  it('digest activé par défaut', () => {
    expect(useSettingsStore.getState().digestEnabled).toBe(true);
  });

  it('heure du digest à 10 par défaut', () => {
    expect(useSettingsStore.getState().digestHour).toBe(10);
  });
});

// ─── setters ──────────────────────────────────────────────────────────────────

describe('setters', () => {
  it('setNotificationsEnabled met à jour notificationsEnabled', () => {
    useSettingsStore.getState().setNotificationsEnabled(false);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
  });

  it('setNotificationsEnabled ne modifie pas les autres champs', () => {
    useSettingsStore.getState().setNotificationsEnabled(false);
    expect(useSettingsStore.getState().checkIntervalMinutes).toBe(180);
    expect(useSettingsStore.getState().hibernationEnabled).toBe(true);
  });

  it('setCheckIntervalMinutes met à jour checkIntervalMinutes', () => {
    useSettingsStore.getState().setCheckIntervalMinutes(360);
    expect(useSettingsStore.getState().checkIntervalMinutes).toBe(360);
  });

  it('setHibernationEnabled met à jour hibernationEnabled', () => {
    useSettingsStore.getState().setHibernationEnabled(false);
    expect(useSettingsStore.getState().hibernationEnabled).toBe(false);
  });

  it('setColorScheme met à jour colorScheme', () => {
    useSettingsStore.getState().setColorScheme('light');
    expect(useSettingsStore.getState().colorScheme).toBe('light');
  });

  it('setNotificationsInSummer met à jour notificationsInSummer', () => {
    useSettingsStore.getState().setNotificationsInSummer(true);
    expect(useSettingsStore.getState().notificationsInSummer).toBe(true);
  });

  it('setOverrideHibernation met à jour overrideHibernation', () => {
    useSettingsStore.getState().setOverrideHibernation(true);
    expect(useSettingsStore.getState().overrideHibernation).toBe(true);
  });

  it('setDigestEnabled met à jour digestEnabled', () => {
    useSettingsStore.getState().setDigestEnabled(false);
    expect(useSettingsStore.getState().digestEnabled).toBe(false);
  });

  it('setDigestHour met à jour digestHour', () => {
    useSettingsStore.getState().setDigestHour(20);
    expect(useSettingsStore.getState().digestHour).toBe(20);
  });
});

// ─── resetAll ────────────────────────────────────────────────────────────────

describe('resetAll', () => {
  it('remet digestEnabled à true', () => {
    useSettingsStore.getState().setDigestEnabled(false);
    useSettingsStore.getState().resetAll();
    expect(useSettingsStore.getState().digestEnabled).toBe(true);
  });

  it('remet digestHour à 10', () => {
    useSettingsStore.getState().setDigestHour(20);
    useSettingsStore.getState().resetAll();
    expect(useSettingsStore.getState().digestHour).toBe(10);
  });

  it('remet notificationsEnabled à true', () => {
    useSettingsStore.getState().setNotificationsEnabled(false);
    useSettingsStore.getState().resetAll();
    expect(useSettingsStore.getState().notificationsEnabled).toBe(true);
  });
});

// ─── resetOffseasonDates ──────────────────────────────────────────────────────

describe('resetOffseasonDates', () => {
  it('restaure les dates par défaut après modification', () => {
    useSettingsStore.getState().setOffseasonStart({month: 6, day: 1});
    useSettingsStore.getState().setOffseasonEnd({month: 9, day: 30});
    useSettingsStore.getState().resetOffseasonDates();
    expect(useSettingsStore.getState().offseasonStart).toEqual(OFFSEASON_START);
    expect(useSettingsStore.getState().offseasonEnd).toEqual(OFFSEASON_END);
  });

  it('ne modifie pas les autres champs', () => {
    useSettingsStore.getState().setNotificationsEnabled(false);
    useSettingsStore.getState().resetOffseasonDates();
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
  });
});
