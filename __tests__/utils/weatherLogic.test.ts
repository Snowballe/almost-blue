/**
 * Tests unitaires pour weatherLogic.ts
 *
 * Contexte temporel fixé avec jest.useFakeTimers() :
 *   now = 2026-06-15T10:00:00Z  (= Paris 12h00, été UTC+2)
 *   cutoff = 2026-06-17T10:00:00Z
 *
 * Tous les slots utilisent des heures en "Paris local" (timezone de l'API).
 * Exemples clés :
 *   Paris 11h le 15/06 = UTC  9h → PASSÉ (< now)     → exclu du résumé
 *   Paris 14h le 15/06 = UTC 12h → FUTUR (> now)     → inclus
 *   Paris 14h le 16/06 = UTC 12h → FUTUR & < cutoff  → inclus
 *   Paris 12h le 17/06 = UTC 10h → = cutoff (exclu)  → exclu
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
    temperature_2m: overrides.temperature_2m ?? new Array(count).fill(15),
    windspeed_10m: overrides.windspeed_10m ?? new Array(count).fill(0),
    winddirection_10m: overrides.winddirection_10m ?? new Array(count).fill(0),
    precipitation: overrides.precipitation ?? new Array(count).fill(0),
    precipitation_probability:
      overrides.precipitation_probability ?? new Array(count).fill(0),
    weathercode: overrides.weathercode ?? new Array(count).fill(0),
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
    temperature: 15,
    windspeed: 0,
    windDirection: 0,
    precipitation: 0,
    precipProbability: 0,
    weatherCode: 0,
    recentRain: false,
    reasons: [],
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

  it('précipitation active (1 mm/h) → score bad', () => {
    const precipitation = new Array(72).fill(0);
    precipitation[0] = 1.0;
    const forecast = buildForecast(makeHourly({precipitation}));
    expect(forecast.slots[0].score).toBe('bad');
  });

  it('code WMO orage (95) → score bad', () => {
    const weathercode = new Array(72).fill(0);
    weathercode[0] = 95;
    const forecast = buildForecast(makeHourly({weathercode}));
    expect(forecast.slots[0].score).toBe('bad');
  });

  it('code WMO neige forte (75) → score bad', () => {
    const weathercode = new Array(72).fill(0);
    weathercode[0] = 75;
    const forecast = buildForecast(makeHourly({weathercode}));
    expect(forecast.slots[0].score).toBe('bad');
  });

  it('probabilité de pluie ≥ 80% → score bad', () => {
    const precipitation_probability = new Array(72).fill(0);
    precipitation_probability[0] = 85;
    const forecast = buildForecast(makeHourly({precipitation_probability}));
    expect(forecast.slots[0].score).toBe('bad');
  });

  it('probabilité de pluie entre 60% et 79% → score ok', () => {
    const precipitation_probability = new Array(72).fill(0);
    precipitation_probability[0] = 65;
    const forecast = buildForecast(makeHourly({precipitation_probability}));
    expect(forecast.slots[0].score).toBe('ok');
  });

  it('température en dessous de 5°C → score ok', () => {
    const temperature_2m = new Array(72).fill(3);
    const forecast = buildForecast(makeHourly({temperature_2m}));
    expect(forecast.slots[0].score).toBe('ok');
  });

  it('pluie récente (dans les 12h précédentes) → recentRain true, score ok', () => {
    // On place de la pluie au slot 5, et on vérifie le slot 6 (i=6, slice(0,6) ⊃ index 5)
    const precipitation = new Array(72).fill(0);
    precipitation[5] = 1.0;
    const forecast = buildForecast(makeHourly({precipitation}));

    expect(forecast.slots[5].score).toBe('bad');   // pluie active sur ce slot
    expect(forecast.slots[6].recentRain).toBe(true);
    expect(forecast.slots[6].score).toBe('ok');    // pluie récente → ok
  });

  it('pluie récente hors de la fenêtre de 12h → recentRain false', () => {
    // Pluie au slot 0, vérification au slot 13 (lookback = 12, slice(1, 13) n'inclut pas 0)
    const precipitation = new Array(72).fill(0);
    precipitation[0] = 1.0;
    const forecast = buildForecast(makeHourly({precipitation}));

    expect(forecast.slots[13].recentRain).toBe(false);
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
    // Supprimer les champs optionnels
    delete (hourly as Partial<OpenMeteoHourly>).winddirection_10m;
    delete (hourly as Partial<OpenMeteoHourly>).precipitation_probability;
    const forecast = buildForecast(hourly);
    expect(forecast.slots[0].windDirection).toBe(0);
    expect(forecast.slots[0].precipProbability).toBe(0);
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

  it('forecast vide → score bad, nextGoodWindow null', () => {
    const summary = getSubSectorSummary(makeForecast([]), 'S');
    expect(summary.score).toBe('bad');
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
      makeSlot('2026-06-16', 6),  // trop tôt (< 7h)
      makeSlot('2026-06-16', 21), // trop tard (> 20h)
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('bad');
  });

  it('tous les slots après le cutoff de 48h → score bad', () => {
    // Paris 14h le 17/06 = UTC 12h > cutoff (UTC 10h le 17/06)
    const slots = [makeSlot('2026-06-17', 14)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('bad');
  });

  // ── Score global ────────────────────────────────────────────────────────────

  it('un slot good dans la fenêtre → overallScore good', () => {
    // Paris 14h le 16/06 = UTC 12h → dans la fenêtre
    const slots = [makeSlot('2026-06-16', 14)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good');
  });

  it('slots tous mauvais → overallScore bad', () => {
    const slots = [
      makeSlot('2026-06-16', 14, {precipitation: 1.0}), // pluie active → bad
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
      makeSlot('2026-06-16', 14), // good
      makeSlot('2026-06-16', 15), // good
      makeSlot('2026-06-16', 16), // good
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.nextGoodWindow?.date).toBe('2026-06-16');
    expect(summary.nextGoodWindow?.startHour).toBe(14);
  });

  /**
   * TEST DE RÉGRESSION : endHour doit être last.hour + 1.
   * Un créneau à 16h couvre 16h00–17h00, donc la fenêtre se termine à 17h.
   * Avant le fix, endHour était 16 au lieu de 17.
   */
  it('[régression endHour+1] dernier créneau à 16h → endHour === 17', () => {
    const slots = [
      makeSlot('2026-06-16', 14),
      makeSlot('2026-06-16', 15),
      makeSlot('2026-06-16', 16), // dernier créneau good
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.nextGoodWindow?.endHour).toBe(17); // 16 + 1
  });

  it('fenêtre good suivie d\'un bad : la bonne fenêtre est capturée', () => {
    const slots = [
      makeSlot('2026-06-16', 14),                           // good
      makeSlot('2026-06-16', 15),                           // good
      makeSlot('2026-06-16', 16, {precipitation: 1.0}),     // bad → clôt la fenêtre
      makeSlot('2026-06-16', 17),                           // good (2ème fenêtre, ignorée)
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.nextGoodWindow?.startHour).toBe(14);
    expect(summary.nextGoodWindow?.endHour).toBe(16); // 15 + 1
  });

  // ── Correctifs d'orientation (température) ──────────────────────────────────

  it('face N (adjust +4°C) : 7°C < seuil effectif (9°C) → ok', () => {
    // effectiveMinTemp = 5 + 4 = 9°C, temperature = 7 < 9 → 1 raison → ok
    const slots = [makeSlot('2026-06-16', 14, {temperature: 7})];
    const summary = getSubSectorSummary(makeForecast(slots), 'N');
    expect(summary.score).toBe('ok');
  });

  it('face S (adjust −2°C) : 7°C ≥ seuil effectif (3°C) → good', () => {
    // effectiveMinTemp = 5 - 2 = 3°C, temperature = 7 ≥ 3 → pas de raison temp → good
    const slots = [makeSlot('2026-06-16', 14, {temperature: 7})];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good');
  });

  it('face NE (adjust +3°C) : 7°C < 8°C → ok', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 7})];
    const summary = getSubSectorSummary(makeForecast(slots), 'NE');
    expect(summary.score).toBe('ok');
  });

  it('face E (adjust 0°C) : 6°C > 5°C → good si pas d\'autre raison', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 6})];
    const summary = getSubSectorSummary(makeForecast(slots), 'E');
    expect(summary.score).toBe('good');
  });

  it('face E : 4°C < seuil (5°C) → ok', () => {
    const slots = [makeSlot('2026-06-16', 14, {temperature: 4})];
    const summary = getSubSectorSummary(makeForecast(slots), 'E');
    expect(summary.score).toBe('ok');
  });

  // ── Pluie récente × exposition au vent ──────────────────────────────────────

  it('pluie récente + vent de face fort → séchage actif → good', () => {
    // Face S (wallDeg = 180°), vent venant du Sud (windDir = 180°)
    // diff = |180 - 180| % 360 = 0 ≤ 60 → 'exposed', windspeed = 20 ≥ 15 → pas de malus
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRain: true,
        windDirection: 180,
        windspeed: 20,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good');
  });

  it('pluie récente + vent de face faible → séchage insuffisant → ok', () => {
    // Face S, vent Sud mais windspeed = 10 < 15 → malus
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRain: true,
        windDirection: 180,
        windspeed: 10,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('ok');
  });

  it('pluie récente + vent de dos → séchage très lent → ok', () => {
    // Face S (wallDeg = 180°), vent du Nord (windDir = 0°)
    // diff = |0 - 180| % 360 = 180, 180 > 180 ? non → 180 → > 120 → 'sheltered'
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRain: true,
        windDirection: 0,
        windspeed: 20,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('ok');
  });

  it('pluie récente + vent de côté → séchage modéré → ok', () => {
    // Face S (wallDeg = 180°), vent de l'Est (windDir = 90°)
    // diff = |90 - 180| % 360 = 90 → 60 < 90 ≤ 120 → 'side'
    const slots = [
      makeSlot('2026-06-16', 14, {
        recentRain: true,
        windDirection: 90,
        windspeed: 20,
      }),
    ];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('ok');
  });

  // ── TEST DE RÉGRESSION : timezone ───────────────────────────────────────────

  /**
   * Avant le fix de parisLocalToUTC(), un device en UTC interprétait
   * "2026-06-15T11:00" comme UTC 11h (futur par rapport à now=10h UTC),
   * l'incluant à tort dans la fenêtre de résumé.
   *
   * Après le fix, Paris 11h = UTC 9h → PASSÉ → exclu quelle que soit la timezone du device.
   */
  it('[régression timezone] slot Paris 11h (= UTC 9h) considéré comme passé', () => {
    // now = 2026-06-15T10:00:00Z (Paris 12h, UTC+2 en été)
    // Paris 11h → UTC 9h → 9h < 10h → PASSÉ → exclu
    const slots = [makeSlot('2026-06-15', 11)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    // Aucun slot futur → bad
    expect(summary.score).toBe('bad');
    expect(summary.nextGoodWindow).toBeNull();
  });

  it('[régression timezone] slot Paris 14h (= UTC 12h) considéré comme futur', () => {
    // Paris 14h → UTC 12h → 12h > 10h → FUTUR → inclus
    const slots = [makeSlot('2026-06-15', 14)];
    const summary = getSubSectorSummary(makeForecast(slots), 'S');
    expect(summary.score).toBe('good'); // conditions neutres → good
  });
});
