import {useNotificationStore} from '../../src/stores/useNotificationStore';

beforeEach(() => {
  useNotificationStore.setState({lastScores: {}});
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
