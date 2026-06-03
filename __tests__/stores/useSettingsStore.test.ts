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
