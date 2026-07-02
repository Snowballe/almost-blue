/**
 * Tests unitaires pour weatherLogic.ts
 *
 * Contexte temporel fixé avec jest.useFakeTimers() :
 *   now    = 2026-06-15T10:00:00Z  (= Paris 12h00, été UTC+2)
 *   cutoff = 2026-06-18T10:00:00Z  (72h après now)
 *
 * Tous les slots utilisent des heures en "Paris local" (timezone de l'API).
 * Exemples clés :
 *   Paris 11h le 15/06 = UTC  9h → PASSÉ (< now)      → exclu du résumé
 *   Paris 14h le 15/06 = UTC 12h → FUTUR (> now)      → inclus
 *   Paris 14h le 16/06 = UTC 12h → FUTUR & < cutoff   → inclus
 *   Paris 14h le 17/06 = UTC 12h → FUTUR & < cutoff   → inclus
 *   Paris 14h le 18/06 = UTC 12h → > cutoff           → exclu
 */

import {buildForecast, getSubSectorSummary} from '../../src/utils/weatherLogic';
import type {OpenMeteoHourly} from '../../src/services/openMeteo';
import type {WeatherForecast, WeatherSlot} from '../../src/types/weather';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Données brutes Open-Meteo neutres sur 3 jours (72 h, Paris local time). */
function makeHourly(
  overrides: Partial<Omit<OpenMeteoHourly, 'time'>> = {},
): OpenMeteoHourly {
  const count = 72;
  const time: string[] = [];
  for (let day = 15; day <= 17; day++) {
    for (let h = 0; h < 24; h++) {
      time.push(
        `2026-06-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`,
      );
    }
  }
  // Indices utiles (heure Paris) :
  //  [0] = 15/06 00h  [14] = 15/06 14h  [38] = 16/06 14h  [62] = 17/06 14h

  return {
    time,
    temperature_2m:          overrides.temperature_2m          ?? new Array(count).fill(15),
    windspeed_10m:            overrides.windspeed_10m            ?? new Array(count).fill(0),
    winddirection_10m:        overrides.winddirection_10m        ?? new Array(count).fill(0),
    precipitation:            overrides.precipitation            ?? new Array(count).fill(0),
    precipitation_probability: overrides.precipitation_probability ?? new Array(count).fill(0),
    weathercode:              overrides.weathercode              ?? new Array(count).fill(0),
  };
}

/** Crée un WeatherSlot aux valeurs neutres (bon temps, 15°C, pas de pluie). */
function makeSlot(
  date: string,
  hour: number,
  overrides: Partial<WeatherSlot> = {},
): WeatherSlot {
  return {
    date,
    hour,
    score: 'good',
    numericScore: 6.5,
    temperature: 15,
    windspeed: 0,
    windDirection: 0,
    precipitation: 0,
    precipProbability: 0,
    weatherCode: 0,
    recentRainMm6h: 0,
    recentRainMm24h: 0,
    ...overrides,
  };
}

function makeForecast(slots: WeatherSlot[]): WeatherForecast {
  return {slots, source: 'open-meteo', fetchedAt: new Date().toISOString()};
}

// ─── buildForecast ────────────────────────────────────────────────────────────

describe('buildForecast', () => {
  it('slot neutre (15°C, pas de pluie, code 0) → score good', () => {
    const forecast = buildForecast(makeHourly());
    expect(forecast.slots[0].score).toBe('good');
  });

  it('slot neutre → numericScore >= 6', () => {
    const forecast = buildForecast(makeHourly());
    expect(forecast.slots[0].numericScore).toBeGreaterThanOrEqual(6);
  });

  it('précipitation active (1 mm/h) → score bad', () => {
    const precipitation = new Array(72).fill(0);
    precipitation[0] = 1.0;
    const forecast = buildForecast(makeHourly({precipitation}));
    expect(forecast.slots[0].score).toBe('bad');
  });

  it('code WMO orage (95) → score bad, numericScore proche de 0', () => {
    const weathercode = new Array(72).fill(0);
    weathercode[0] = 95;
    const forecast = buildForecast(makeHourly({weathercode}));
    expect(forecast.slots[0].score).toBe('bad');
    expect(forecast.slots[0].numericScore).toBeLessThan(2);
  });

  it('code WMO neige forte (75) → score bad', () => {
    const weathercode = new Array(72).fill(0);
    weathercode[0] = 75;
    const forecast = buildForecast(makeHourly({weathercode}));
    expect(forecast.slots[0].score).toBe('bad');
  });

  it('probabilité de pluie ≥ 70% → score bad', () => {
    const precipitation_probability = new Array(72).fill(0);
    precipitation_probability[0] = 75;
    const forecast = buildForecast(makeHourly({precipitation_probability}));
    expect(forecast.slots[0].score).toBe('bad');
  });

  it('probabilité de pluie entre 40% et 69% → score ok', () => {
    const precipitation_probability = new Array(72).fill(0);
    precipitation_probability[0] = 45;
    const forecast = buildForecast(makeHourly({precipitation_probability}));
    expect(forecast.slots[0].score).toBe('ok');
  });

  it('probabilité de pluie < 40% → score good', () => {
    const precipitation_probability = new Array(72).fill(0);
    precipitation_probability[0] = 35;
    const forecast = buildForecast(makeHourly({precipitation_probability}));
    expect(forecast.slots[0].score).toBe('good');
  });

  it('froid sec modéré (3°C) → score good (le froid ne pénalise plus)', () => {
    const temperature_2m = new Array(72).fill(3);
    const forecast = buildForecast(makeHourly({temperature_2m}));
    expect(forecast.slots[0].score).toBe('good');
  });

  it('température proche de 0°C → score ok (pénalité froid résiduelle)', () => {
    const temperature_2m = new Array(72).fill(0);
    const forecast = buildForecast(makeHourly({temperature_2m}));
    expect(forecast.slots[0].score).toBe('ok');
  });

  it('pluie récente (dans les 6h précédentes) → recentRainMm6h > 0, score ok', () => {
    const precipitation = new Array(72).fill(0);
    precipitation[5] = 1.0;
    const forecast = buildForecast(makeHourly({precipitation}));

    expect(forecast.slots[5].score).toBe('bad');          // pluie active sur ce slot
    expect(forecast.slots[6].recentRainMm6h).toBeGreaterThan(0);
    expect(forecast.slots[6].score).toBe('ok');           // pluie récente → ok
  });

  it('pluie récente hors de la fenêtre de 6h → recentRainMm6h = 0, score good', () => {
    const precipitation = new Array(72).fill(0);
    precipitation[0] = 1.0;
    const forecast = buildForecast(makeHourly({precipitation}));

    expect(forecast.slots[13].recentRainMm6h).toBe(0);
    expect(forecast.slots[13].score).toBe('good');
  });

  it('extrait correctement date et heure depuis la string de temps', () => {
    const forecast = buildForecast(makeHourly());
    expect(forecast.slots[14].date).toBe('2026-06-15');
    expect(forecast.slots[14].hour).toBe(14);
    expect(forecast.slots[38].date).toBe('2026-06-16');
    expect(forecast.slots[38].hour).toBe(14);
  });

  it('fields optionnels absents → valeur par défaut 0', () => {
    const hourly = makeHourly();
    delete (hourly as Partial<OpenMeteoHourly>).winddirection_10m;
    delete (hourly as Partial<OpenMeteoHourly>).precipitation_probability;
    const forecast = buildForecast(hourly);
    expect(forecast.slots[0].windDirection).toBe(0);
    expect(forecast.slots[0].precipProbability).toBe(0);
  });

  it('numericScore toujours dans [0, 10]', () => {
    const weathercode = new Array(72).fill(95); // orages partout
    const forecast = buildForecast(makeHourly({weathercode}));
    for (const slot of forecast.slots) {
      expect(slot.numericScore).toBeGreaterThanOrEqual(0);
      expect(slot.numericScore).toBeLessThanOrEqual(10);
    }
  });
});

// ─── getSubSectorSummary ──────────────────────────────────────────────────────

describe('getSubSectorSummary', () => {
  // Heure fixée : 2026-06-15T10:00:00Z (= Paris 12h00 en été, UTC+2)
  const FIXED_NOW = new Date('2026-06-15T10:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Cas limites ─────────────────────────────────────────────────────────────

  it('forecast vide → score bad, numericScore 0, nextGoodWindow null', () => {
    const summary = getSubSectorSummary(makeForecast([]), 'S');
    expect(summary.score).toBe('bad');
    expect(summary.numericScore).toBe(0);
    expect(summary.nextGoodWindow).toBeNull();
  });

  it('tous les slots dans le passé → score bad', () => {
    // Paris 11h le 15/06 = UTC 9h < now (UTC 10h) → passé
    const slots = [makeSlot('2026-06-15', 11)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('bad');
  });

  it('slots hors fenêtre horaire (nuit : 6h, 21h) → filtrés', () => {
    const slots = [
      makeSlot('2026-06-16', 6),   // trop tôt (< 7h)
      makeSlot('2026-06-16', 21),  // trop tard (> 20h)
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('bad');
  });

  it('tous les slots après le cutoff de 72h → score bad', () => {
    // Paris 14h le 18/06 = UTC 12h > cutoff (2026-06-18T10:00Z)
    const slots = [makeSlot('2026-06-18', 14)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('bad');
  });

  it('slot à 72h pile (Paris 14h le 17/06 = UTC 12h) → inclus dans la fenêtre', () => {
    const slots = [makeSlot('2026-06-17', 14)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good');
  });

  // ── Score global ────────────────────────────────────────────────────────────

  it('un slot good dans la fenêtre → overallScore good', () => {
    const slots = [makeSlot('2026-06-16', 14)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good');
  });

  it('numericScore reflète le meilleur slot de la fenêtre', () => {
    const slots = [
      makeSlot('2026-06-16', 14),                         // conditions neutres → numericScore ~6.5
      makeSlot('2026-06-16', 15, {precipitation: 1.0}),   // mauvais
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.numericScore).toBeGreaterThanOrEqual(6);
  });

  it('slots tous mauvais → overallScore bad', () => {
    const slots = [
      makeSlot('2026-06-16', 14, {precipitation: 1.0}),
      makeSlot('2026-06-16', 15, {precipitation: 1.0}),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('bad');
  });

  it('mix ok+bad sans good → overallScore ok', () => {
    const slots = [
      makeSlot('2026-06-16', 14, {precipProbability: 65}), // ok
      makeSlot('2026-06-16', 15, {precipitation: 1.0}),    // bad
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('ok');
  });

  // ── Score numérique ─────────────────────────────────────────────────────────

  it('orage → numericScore < 2', () => {
    const slots = [makeSlot('2026-06-16', 14, {weatherCode: 95})];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.numericScore).toBeLessThan(2);
  });

  it('météo idéale (ciel dégagé, vent séchant de face) → numericScore > 7', () => {
    const slots = [
      makeSlot('2026-06-16', 14, {
        weatherCode: 0,       // ciel dégagé
        windDirection: 180,   // face S, vent du Sud = vent de face
        windspeed: 20,        // vent fort → séchage actif
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S', 'fast');
    expect(summary.numericScore).toBeGreaterThan(7);
  });

  it('numericScore toujours dans [0, 10]', () => {
    const slots = [
      makeSlot('2026-06-16', 14, {weatherCode: 95, precipitation: 5.0}), // pire cas
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'N');
    expect(summary.numericScore).toBeGreaterThanOrEqual(0);
    expect(summary.numericScore).toBeLessThanOrEqual(10);
  });

  // ── Fenêtre good (nextGoodWindow) ───────────────────────────────────────────

  it('aucun créneau good → nextGoodWindow null', () => {
    const slots = [
      makeSlot('2026-06-16', 14, {precipProbability: 65}), // ok seulement
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.nextGoodWindow).toBeNull();
  });

  it('fenêtre good détectée : date et startHour corrects', () => {
    const slots = [
      makeSlot('2026-06-16', 14),
      makeSlot('2026-06-16', 15),
      makeSlot('2026-06-16', 16),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.nextGoodWindow?.date).toBe('2026-06-16');
    expect(summary.nextGoodWindow?.startHour).toBe(14);
  });

  /**
   * TEST DE RÉGRESSION : endHour doit être last.hour + 1.
   * Un créneau à 16h couvre 16h00–17h00, donc la fenêtre se termine à 17h.
   */
  it('[régression endHour+1] dernier créneau à 16h → endHour === 17', () => {
    const slots = [
      makeSlot('2026-06-16', 14),
      makeSlot('2026-06-16', 15),
      makeSlot('2026-06-16', 16),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.nextGoodWindow?.endHour).toBe(17);
  });

  it("fenêtre good suivie d'un bad : la bonne fenêtre est capturée", () => {
    const slots = [
      makeSlot('2026-06-16', 14),
      makeSlot('2026-06-16', 15),
      makeSlot('2026-06-16', 16, {precipitation: 1.0}),  // bad → clôt la fenêtre
      makeSlot('2026-06-16', 17),                        // good (2ème fenêtre, ignorée)
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.nextGoodWindow?.startHour).toBe(14);
    expect(summary.nextGoodWindow?.endHour).toBe(16); // 15 + 1
  });

  // ── Correctifs d'orientation (température) ──────────────────────────────────

  // Seuil de base MIN_TEMP = 2°C, pénalité douce (0.5/°C) : le froid sec ne mord
  // que près de 0°C. Le correctif d'orientation relève/abaisse ce seuil.

  it('face N (adjust +4°C) : 4°C < seuil effectif (6°C) → ok', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 4})];
    const summary = getSubSectorSummary(makeForecast(slots), 'N');
    expect(summary.score).toBe('ok');
  });

  it('face N (adjust +4°C) : 7°C ≥ seuil effectif (6°C) → good', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 7})];
    const summary = getSubSectorSummary(makeForecast(slots), 'N');
    expect(summary.score).toBe('good');
  });

  it('face S (adjust −2°C) : 7°C ≥ seuil effectif (0°C) → good', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 7})];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good');
  });

  it('face NE (adjust +3°C) : 3°C < seuil effectif (5°C) → ok', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 3})];
    const summary = getSubSectorSummary(makeForecast(slots), 'NE');
    expect(summary.score).toBe('ok');
  });

  it('face E (adjust 0°C) : 6°C > seuil (2°C) → good', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 6})];
    const summary = getSubSectorSummary(makeForecast(slots), 'E');
    expect(summary.score).toBe('good');
  });

  it('face E : 0°C < seuil (2°C) → ok', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 0})];
    const summary = getSubSectorSummary(makeForecast(slots), 'E');
    expect(summary.score).toBe('ok');
  });

  // ── Pluie récente × exposition au vent ──────────────────────────────────────

  it('pluie récente + vent de face fort → séchage actif → good', () => {
    // Face S (wallDeg = 180°), vent venant du Sud (windDir = 180°)
    // diff = 0 ≤ 60 → 'exposed', windspeed = 20 ≥ 15 → EXPOSURE_EXPOSED_STRONG = 0
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRainMm6h: 2.0,
        windDirection: 180,
        windspeed: 20,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S', 'fast');
    expect(summary.score).toBe('good');
  });

  it('pluie récente légère + roche rapide → sèche assez → good', () => {
    // Coef fast doux (−0.5/mm) : 2 mm avec un léger vent de face → reste good.
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRainMm6h: 2.0,
        windDirection: 180,
        windspeed: 10,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S', 'fast');
    expect(summary.score).toBe('good');
  });

  it('pluie récente + roche lente (slow) → prudent → bad', () => {
    // Contraste avec le cas fast : coef slow sévère (−1.5/mm) sur la fenêtre 24h.
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRainMm24h: 3.0,
        windDirection: 0,
        windspeed: 0,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S', 'slow');
    expect(summary.score).toBe('bad');
  });

  it('pluie récente + vent de dos → séchage très lent → ok', () => {
    // Face S (wallDeg = 180°), vent du Nord (windDir = 0°) → sheltered
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRainMm6h: 2.0,
        windDirection: 0,
        windspeed: 20,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S', 'fast');
    expect(summary.score).toBe('ok');
  });

  it('pluie récente + vent de côté → séchage modéré → ok', () => {
    // Face S (wallDeg = 180°), vent de l'Est (windDir = 90°) → side
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRainMm6h: 2.0,
        windDirection: 90,
        windspeed: 20,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S', 'fast');
    expect(summary.score).toBe('ok');
  });

  it('roche lente (slow) utilise recentRainMm24h', () => {
    // Pluie significative en 24h mais pas en 6h → pénalité pour roche lente
    const slotFast = makeSlot('2026-06-16', 14, {recentRainMm6h: 0, recentRainMm24h: 5.0});
    const slotSlow = makeSlot('2026-06-16', 14, {recentRainMm6h: 0, recentRainMm24h: 5.0});
    const summaryFast = getSubSectorSummary(makeForecast([slotFast]), 'S', 'fast');
    const summarySlow = getSubSectorSummary(makeForecast([slotSlow]), 'S', 'slow');
    // Roche rapide ignore 24h → pas de pénalité → meilleur score
    expect(summaryFast.numericScore).toBeGreaterThan(summarySlow.numericScore);
  });

  // ── TEST DE RÉGRESSION : timezone ───────────────────────────────────────────

  /**
   * Sans parisLocalToUTC(), un device en UTC interprète "2026-06-15T11:00"
   * comme UTC 11h (futur), l'incluant à tort dans la fenêtre.
   * Après le fix, Paris 11h = UTC 9h → PASSÉ → exclu.
   */
  it('[régression timezone] slot Paris 11h (= UTC 9h) considéré comme passé', () => {
    const slots = [makeSlot('2026-06-15', 11)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('bad');
    expect(summary.nextGoodWindow).toBeNull();
  });

  it('[régression timezone] slot Paris 14h (= UTC 12h) considéré comme futur', () => {
    const slots = [makeSlot('2026-06-15', 14)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good');
  });

  // now = 2026-06-15T10:00Z → cutoff 72h = 2026-06-18T10:00Z, cutoff 168h = 2026-06-22T10:00Z
  // Paris 14h le 19/06 = UTC 12h → hors 72h mais dans 168h
  it('horizonHours=168 inclut un slot à J+4 exclu en 72h', () => {
    const slotJ4 = makeSlot('2026-06-19', 14);
    const forecast = makeForecast([slotJ4]);
    expect(getSubSectorSummary(forecast, 'S', 'slow', 72).score).toBe('bad');
    expect(getSubSectorSummary(forecast, 'S', 'slow', 168).score).toBe('good');
  });
});
