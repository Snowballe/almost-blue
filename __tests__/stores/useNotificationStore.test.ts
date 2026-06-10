import {useNotificationStore} from '../../src/stores/useNotificationStore';

beforeEach(() => {
  useNotificationStore.setState({lastScores: {}, lastDigestDate: null, lastDigestSummary: null});
});

describe('état initial', () => {
  it('lastScores est un objet vide', () => {
    expect(useNotificationStore.getState().lastScores).toEqual({});
  });
});

describe('setScores', () => {
  it('remplace lastScores avec le nouvel objet', () => {
    useNotificationStore.getState().setScores({'buoux:S': 'good'});
    expect(useNotificationStore.getState().lastScores).toEqual({'buoux:S': 'good'});
  });

  it('écrase les scores précédents entièrement', () => {
    useNotificationStore.getState().setScores({'buoux:S': 'good'});
    useNotificationStore.getState().setScores({'buoux:S': 'bad', 'buoux:SE': 'ok'});
    expect(useNotificationStore.getState().lastScores).toEqual({
      'buoux:S':  'bad',
      'buoux:SE': 'ok',
    });
  });

  it('accepte un objet vide (remise à zéro des scores)', () => {
    useNotificationStore.getState().setScores({'buoux:S': 'good'});
    useNotificationStore.getState().setScores({});
    expect(useNotificationStore.getState().lastScores).toEqual({});
  });
});

describe('clearScores', () => {
  it('vide lastScores', () => {
    useNotificationStore.getState().setScores({'buoux:S': 'good', 'buoux:SE': 'bad'});
    useNotificationStore.getState().clearScores();
    expect(useNotificationStore.getState().lastScores).toEqual({});
  });

  it('est idempotent sur un store déjà vide', () => {
    useNotificationStore.getState().clearScores();
    expect(useNotificationStore.getState().lastScores).toEqual({});
  });
});

describe('lastDigestDate', () => {
  it('est null par défaut', () => {
    expect(useNotificationStore.getState().lastDigestDate).toBeNull();
  });

  it('setLastDigestDate met à jour la date', () => {
    useNotificationStore.getState().setLastDigestDate('2026-12-15');
    expect(useNotificationStore.getState().lastDigestDate).toBe('2026-12-15');
  });

  it('setLastDigestDate écrase la date précédente', () => {
    useNotificationStore.getState().setLastDigestDate('2026-12-15');
    useNotificationStore.getState().setLastDigestDate('2026-12-16');
    expect(useNotificationStore.getState().lastDigestDate).toBe('2026-12-16');
  });
});

describe('lastDigestSummary', () => {
  it('est null par défaut', () => {
    expect(useNotificationStore.getState().lastDigestSummary).toBeNull();
  });

  it('setLastDigestSummary met à jour le résumé', () => {
    useNotificationStore.getState().setLastDigestSummary('Buoux — Face Sud : grimpable demain');
    expect(useNotificationStore.getState().lastDigestSummary).toBe('Buoux — Face Sud : grimpable demain');
  });

  it('setLastDigestSummary écrase la valeur précédente', () => {
    useNotificationStore.getState().setLastDigestSummary('ancien');
    useNotificationStore.getState().setLastDigestSummary('nouveau');
    expect(useNotificationStore.getState().lastDigestSummary).toBe('nouveau');
  });

  it('setLastDigestSummary accepte null (remise à zéro)', () => {
    useNotificationStore.getState().setLastDigestSummary('contenu');
    useNotificationStore.getState().setLastDigestSummary(null);
    expect(useNotificationStore.getState().lastDigestSummary).toBeNull();
  });
});
