import axios from 'axios';
import {getCachedForecast} from '../../src/services/openMeteo';

jest.mock('axios');
const mockedGet = (axios as jest.Mocked<typeof axios>).get;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h, doit correspondre à openMeteo.ts

// Données hourly minimales valides pour buildForecast
const MOCK_HOURLY = {
  time:             ['2026-06-01T00:00', '2026-06-01T01:00', '2026-06-01T02:00'],
  temperature_2m:   [15, 16, 14],
  windspeed_10m:    [10, 12,  8],
  precipitation:    [ 0,  0,  0],
  weathercode:      [ 0,  0,  0],
};

function setupSuccess(): void {
  mockedGet.mockResolvedValue({data: {hourly: MOCK_HOURLY}});
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── premier appel ────────────────────────────────────────────────────────────

describe('premier appel', () => {
  it('appelle axios.get et retourne un forecast', async () => {
    setupSuccess();
    const forecast = await getCachedForecast(10.0, 10.0);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(forecast).toBeDefined();
    expect(typeof forecast).toBe('object');
  });

  it('passe les bons paramètres de coordonnées à axios', async () => {
    setupSuccess();
    await getCachedForecast(48.7166, 2.3001);
    const callParams = mockedGet.mock.calls[0][1]?.params;
    expect(callParams?.latitude).toBe(48.7166);
    expect(callParams?.longitude).toBe(2.3001);
  });
});

// ─── cache hit ────────────────────────────────────────────────────────────────

describe('cache hit (< 1h)', () => {
  it('deuxième appel identique ne rappelle pas axios', async () => {
    setupSuccess();
    const f1 = await getCachedForecast(11.0, 11.0);
    jest.clearAllMocks();
    const f2 = await getCachedForecast(11.0, 11.0);
    expect(mockedGet).not.toHaveBeenCalled();
    expect(f1).toBe(f2); // même référence objet
  });
});

// ─── cache expiration ─────────────────────────────────────────────────────────

describe('expiration du TTL', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(()  => { jest.useRealTimers(); });

  it('recharge après 1h+1ms', async () => {
    setupSuccess();
    await getCachedForecast(12.0, 12.0);
    jest.advanceTimersByTime(CACHE_TTL_MS + 1);
    jest.clearAllMocks();
    setupSuccess();
    await getCachedForecast(12.0, 12.0);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it('ne recharge pas juste avant expiration (1h-1ms)', async () => {
    setupSuccess();
    await getCachedForecast(13.0, 13.0);
    jest.advanceTimersByTime(CACHE_TTL_MS - 1);
    jest.clearAllMocks();
    await getCachedForecast(13.0, 13.0);
    expect(mockedGet).not.toHaveBeenCalled();
  });
});

// ─── déduplication des requêtes en vol ────────────────────────────────────────

describe('déduplication (requêtes concurrentes)', () => {
  it('deux appels simultanés partagent une seule requête axios', async () => {
    let resolveAxios!: (v: unknown) => void;
    mockedGet.mockImplementation(
      () => new Promise(res => { resolveAxios = res; }),
    );

    const p1 = getCachedForecast(14.0, 14.0);
    const p2 = getCachedForecast(14.0, 14.0); // doit réutiliser la promesse en vol

    resolveAxios({data: {hourly: MOCK_HOURLY}});

    const [f1, f2] = await Promise.all([p1, p2]);
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(f1).toBe(f2);
  });
});

// ─── normalisation de la clé de cache ────────────────────────────────────────

describe('normalisation des coordonnées (4 décimales)', () => {
  it('coordonnées légèrement différentes partagent le même cache', async () => {
    setupSuccess();
    await getCachedForecast(48.71664799, 2.30001); // arrondi → 48.7166,2.3000
    jest.clearAllMocks();
    await getCachedForecast(48.7166, 2.3000);     // même clé
    expect(mockedGet).not.toHaveBeenCalled();
  });
});

// ─── réponse invalide ─────────────────────────────────────────────────────────

describe('réponse invalide', () => {
  it("lève une erreur si hourly.time est absent", async () => {
    mockedGet.mockResolvedValue({data: {hourly: {}}});
    await expect(getCachedForecast(15.0, 15.0)).rejects.toThrow('Open-Meteo');
  });
});
