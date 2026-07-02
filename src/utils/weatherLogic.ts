import {OpenMeteoHourly} from '../services/openMeteo';
import {
  WeatherForecast,
  WeatherSlot,
  WeatherScore,
  SubSectorSummary,
} from '../types/weather';
import {Orientation} from '../types/sector';

// ─── Seuils ──────────────────────────────────────────────────────────────────

const MIN_TEMP        = 2;   // °C minimal (avant correctif d'orientation) — froid sec ≈ bonne friction, on ne mord que près de 0°C
const MIN_WIND_DRYING = 15;  // km/h — vent de face pour séchage actif
const MAX_PRECIP      = 0.5; // mm/h — précipitation active

// ─── Poids du modèle additif ─────────────────────────────────────────────────

/**
 * Tous les poids du modèle de score. Modifiez ces valeurs pour recalibrer
 * le score sans toucher à la logique.
 *
 * Échelle : [0, 10]. BASE = 6 (conditions neutres, avant bonus/malus).
 * Seuils : score >= THRESHOLD_GOOD → 'good', >= THRESHOLD_OK → 'ok', sinon 'bad'.
 */
export const SCORE_WEIGHTS = {
  BASE: 6,

  // Précipitations actives (par mm/h)
  PRECIP_ACTIVE_PER_MM: -2.5,

  // Probabilité de pluie
  PRECIP_PROB_HIGH:           -3.0,
  PRECIP_PROB_HIGH_THRESHOLD:  70,
  PRECIP_PROB_WARN:           -2.0,
  PRECIP_PROB_WARN_THRESHOLD:  40,

  // Pluie récente — coefficient par mm cumulé dans la fenêtre de lookback.
  // Dépend du type de roche : le granite/grès (fast) sèche vite → pénalité douce ;
  // le calcaire/conglomérat (slow), souvent friable, reste humide → pénalité sévère.
  RECENT_RAIN_PER_MM_FAST: -0.5,
  RECENT_RAIN_PER_MM_SLOW: -1.5,

  // Multiplicateur d'exposition au vent sur la pluie récente
  // 0 = vent de face fort → séchage actif → pas de malus pluie
  EXPOSURE_SHELTERED:       1.00,
  EXPOSURE_SIDE:            0.75,
  EXPOSURE_EXPOSED_WEAK:    0.50,
  EXPOSURE_EXPOSED_STRONG:  0.00,

  // Température effective (par degré en dessous du seuil) — pénalité résiduelle
  // faible : le froid sec n'est pas un problème pour la grimpe (meilleure friction).
  TEMP_COLD_PER_DEG: 0.5,

  // Bonus vent séchant (face exposée + vent >= MIN_WIND_DRYING)
  WIND_DRYING_BONUS: 1.0,

  // Vent fort (inconfort / sécurité)
  WIND_STRONG_PENALTY:   -1.5,
  WIND_STRONG_THRESHOLD:  60,  // km/h

  // Bonus ciel dégagé (codes WMO 0 et 1)
  WMO_CLEAR_BONUS: 0.5,

  // Malus par catégorie WMO (appliqués une seule fois, pas cumulables)
  WMO_STORM_PENALTY:      -6.0,  // orages
  WMO_SNOW_PENALTY:       -4.0,  // neige / grésil
  WMO_HEAVY_RAIN_PENALTY: -3.0,  // pluie forte / averses fortes

  // Seuils de dérivation WeatherScore
  THRESHOLD_GOOD: 6.0,
  THRESHOLD_OK:   4.0,
} as const;

// ─── Codes WMO par catégorie ──────────────────────────────────────────────────

const WMO_CODES_STORM = new Set([95, 96, 99]);
const WMO_CODES_SNOW  = new Set([71, 73, 75, 77, 85, 86]);
const WMO_CODES_RAIN  = new Set([55, 57, 63, 65, 67, 81, 82]);
const WMO_CODES_CLEAR = new Set([0, 1]);

// ─── Orientation → correctif température ─────────────────────────────────────

/**
 * Correctif appliqué à MIN_TEMP selon l'ensoleillement de la paroi.
 * Face N plus froide (seuil relevé), face S plus chaude (seuil abaissé).
 */
const ORIENTATION_TEMP_ADJUST: Record<Orientation, number> = {
  N:   4, NE:  3, NW:  2,
  E:   0, W:   0,
  SE: -1, S:  -2, SW: -2,
};

// ─── Orientation → degrés ────────────────────────────────────────────────────

const ORIENTATION_DEG: Record<Orientation, number> = {
  N: 0, NE: 45, E: 90, SE: 135,
  S: 180, SW: 225, W: 270, NW: 315,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type WindExposure = 'exposed' | 'side' | 'sheltered';

function getWindExposure(windDir: number, orientation: Orientation): WindExposure {
  const wallDeg = ORIENTATION_DEG[orientation];
  let diff = Math.abs(windDir - wallDeg) % 360;
  if (diff > 180) diff = 360 - diff;
  if (diff <= 60)  return 'exposed';
  if (diff <= 120) return 'side';
  return 'sheltered';
}

function numericToWeatherScore(n: number): WeatherScore {
  if (n >= SCORE_WEIGHTS.THRESHOLD_GOOD) return 'good';
  if (n >= SCORE_WEIGHTS.THRESHOLD_OK)   return 'ok';
  return 'bad';
}

function clamp(n: number): number {
  return Math.max(0, Math.min(10, n));
}

// ─── Score orienté (utilisé par getSubSectorSummary) ─────────────────────────

/**
 * Calcule le score d'un créneau en tenant compte de l'orientation de la paroi
 * et du type de roche (vitesse de séchage).
 */
function scoreSlotNumeric(
  slot: WeatherSlot,
  orientation: Orientation,
  rockType: 'fast' | 'slow',
): number {
  let score = SCORE_WEIGHTS.BASE;

  // 1. Précipitations actives
  if (slot.precipitation > MAX_PRECIP) {
    score += SCORE_WEIGHTS.PRECIP_ACTIVE_PER_MM * slot.precipitation;
  } else {
    // Bonus/malus WMO (mutuellement exclusifs, ordre décroissant de gravité)
    if (WMO_CODES_STORM.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_STORM_PENALTY;
    } else if (WMO_CODES_SNOW.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_SNOW_PENALTY;
    } else if (WMO_CODES_RAIN.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_HEAVY_RAIN_PENALTY;
    } else if (WMO_CODES_CLEAR.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_CLEAR_BONUS;
    }
  }

  // 2. Probabilité de pluie
  if (slot.precipProbability >= SCORE_WEIGHTS.PRECIP_PROB_HIGH_THRESHOLD) {
    score += SCORE_WEIGHTS.PRECIP_PROB_HIGH;
  } else if (slot.precipProbability >= SCORE_WEIGHTS.PRECIP_PROB_WARN_THRESHOLD) {
    score += SCORE_WEIGHTS.PRECIP_PROB_WARN;
  }

  // 3. Température effective (avec correctif d'orientation)
  const tempAdjust = ORIENTATION_TEMP_ADJUST[orientation] ?? 0;
  const effectiveMinTemp = MIN_TEMP + tempAdjust;
  if (slot.temperature < effectiveMinTemp) {
    score -= (effectiveMinTemp - slot.temperature) * SCORE_WEIGHTS.TEMP_COLD_PER_DEG;
  }

  // 4. Vent fort
  if (slot.windspeed > SCORE_WEIGHTS.WIND_STRONG_THRESHOLD) {
    score += SCORE_WEIGHTS.WIND_STRONG_PENALTY;
  }

  // 5. Pluie récente × exposition au vent — fenêtre et sévérité selon le type de roche
  const recentRainMm = rockType === 'fast' ? slot.recentRainMm6h : slot.recentRainMm24h;
  const recentRainCoef =
    rockType === 'fast'
      ? SCORE_WEIGHTS.RECENT_RAIN_PER_MM_FAST
      : SCORE_WEIGHTS.RECENT_RAIN_PER_MM_SLOW;
  if (recentRainMm > 0) {
    const exposure = getWindExposure(slot.windDirection, orientation);
    const exposureMultiplier =
      exposure === 'sheltered'                                     ? SCORE_WEIGHTS.EXPOSURE_SHELTERED :
      exposure === 'side'                                          ? SCORE_WEIGHTS.EXPOSURE_SIDE :
      slot.windspeed >= MIN_WIND_DRYING                            ? SCORE_WEIGHTS.EXPOSURE_EXPOSED_STRONG :
                                                                     SCORE_WEIGHTS.EXPOSURE_EXPOSED_WEAK;

    score += recentRainCoef * recentRainMm * exposureMultiplier;

    // Bonus vent séchant : vent de face fort annule déjà le malus pluie via
    // EXPOSURE_EXPOSED_STRONG = 0. On ajoute en plus un bonus si l'expo est favorable.
  } else if (
    slot.precipitation === 0 &&
    getWindExposure(slot.windDirection, orientation) === 'exposed' &&
    slot.windspeed >= MIN_WIND_DRYING
  ) {
    // Vent de face, pas de pluie : conditions idéales de séchage
    score += SCORE_WEIGHTS.WIND_DRYING_BONUS;
  }

  return clamp(score);
}

// ─── Score de base (sans orientation, pour les pins de la carte) ──────────────

/**
 * Score simplifié, sans correctif d'orientation.
 * Utilisé par buildForecast pour le pin de la carte.
 * Hypothèse conservatrice : séchage lent (pluie récente = pénalité pleine).
 */
function scoreSlotBase(slot: WeatherSlot): number {
  let score = SCORE_WEIGHTS.BASE;

  if (slot.precipitation > MAX_PRECIP) {
    score += SCORE_WEIGHTS.PRECIP_ACTIVE_PER_MM * slot.precipitation;
  } else {
    if (WMO_CODES_STORM.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_STORM_PENALTY;
    } else if (WMO_CODES_SNOW.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_SNOW_PENALTY;
    } else if (WMO_CODES_RAIN.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_HEAVY_RAIN_PENALTY;
    } else if (WMO_CODES_CLEAR.has(slot.weatherCode)) {
      score += SCORE_WEIGHTS.WMO_CLEAR_BONUS;
    }
  }

  if (slot.precipProbability >= SCORE_WEIGHTS.PRECIP_PROB_HIGH_THRESHOLD) {
    score += SCORE_WEIGHTS.PRECIP_PROB_HIGH;
  } else if (slot.precipProbability >= SCORE_WEIGHTS.PRECIP_PROB_WARN_THRESHOLD) {
    score += SCORE_WEIGHTS.PRECIP_PROB_WARN;
  }

  if (slot.temperature < MIN_TEMP) {
    score -= (MIN_TEMP - slot.temperature) * SCORE_WEIGHTS.TEMP_COLD_PER_DEG;
  }

  // Pluie récente : hypothèse conservatrice (séchage lent + abrité, pénalité max)
  if (slot.recentRainMm6h > 0) {
    score += SCORE_WEIGHTS.RECENT_RAIN_PER_MM_SLOW * slot.recentRainMm6h * SCORE_WEIGHTS.EXPOSURE_SHELTERED;
  }

  return clamp(score);
}

// ─── Construction du forecast brut ───────────────────────────────────────────

/**
 * Transforme la réponse horaire Open-Meteo en WeatherForecast.
 * Le `numericScore` de chaque slot est calculé sans orientation (conservative),
 * et sert d'estimation générique pour les pins de la carte.
 */
export function buildForecast(hourly: OpenMeteoHourly): WeatherForecast {
  const slots: WeatherSlot[] = hourly.time.map((t, i) => {
    const date = t.slice(0, 10);
    const hour = parseInt(t.slice(11, 13), 10);

    const precipitation       = hourly.precipitation[i] ?? 0;
    const precipProbability   = hourly.precipitation_probability?.[i] ?? 0;
    const weatherCode         = hourly.weathercode[i] ?? 0;
    const windspeed           = hourly.windspeed_10m[i] ?? 0;
    const windDirection       = hourly.winddirection_10m?.[i] ?? 0;
    const temperature         = hourly.temperature_2m[i] ?? 0;

    const start6  = Math.max(0, i - 6);
    const start24 = Math.max(0, i - 24);
    const recentRainMm6h  = hourly.precipitation.slice(start6,  i).reduce((s, p) => s + (p ?? 0), 0);
    const recentRainMm24h = hourly.precipitation.slice(start24, i).reduce((s, p) => s + (p ?? 0), 0);

    const slot: WeatherSlot = {
      date, hour,
      score: 'good', // placeholder, recalculé ci-dessous
      numericScore: 0,
      temperature,
      windspeed,
      windDirection,
      precipitation,
      precipProbability,
      weatherCode,
      recentRainMm6h,
      recentRainMm24h,
    };

    const numericScore = scoreSlotBase(slot);
    return {...slot, numericScore, score: numericToWeatherScore(numericScore)};
  });

  return {slots, source: 'open-meteo', fetchedAt: new Date().toISOString()};
}

// ─── Utilitaire timezone ──────────────────────────────────────────────────────

/**
 * Convertit une date + heure en heure locale Europe/Paris vers un timestamp UTC.
 * Algorithme DST-aware : calcule l'offset Paris/UTC à midi UTC ce jour-là.
 */
function parisLocalToUTC(dateStr: string, hour: number): number {
  const refUTC = new Date(`${dateStr}T12:00:00Z`).getTime();
  const parisNoon =
    parseInt(
      new Date(refUTC).toLocaleString('en-US', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        hour12: false,
      }),
      10,
    ) % 24;
  const parisOffsetH = parisNoon - 12;
  const utcMidnight  = new Date(`${dateStr}T00:00:00Z`).getTime();
  return utcMidnight + (hour - parisOffsetH) * 60 * 60 * 1000;
}

// ─── Résumé par sous-secteur ──────────────────────────────────────────────────

/**
 * Calcule le meilleur score d'un sous-secteur sur les 72 prochaines heures de
 * jour (7h–20h), avec correctif d'orientation et de type de roche.
 *
 * Retourne aussi la première fenêtre de créneaux "good" consécutifs.
 */
export function getSubSectorSummary(
  forecast: WeatherForecast,
  orientation: Orientation,
  rockType: 'fast' | 'slow' = 'slow',
  horizonHours: number = 72,
): SubSectorSummary {
  const now    = Date.now();
  const cutoff = now + horizonHours * 60 * 60 * 1000;

  const relevant = forecast.slots.filter(slot => {
    if (slot.hour < 7 || slot.hour > 20) return false;
    const ts = parisLocalToUTC(slot.date, slot.hour);
    return ts > now && ts < cutoff;
  });

  if (relevant.length === 0) return {score: 'bad', numericScore: 0, nextGoodWindow: null};

  // Score chaque créneau avec l'orientation et le type de roche
  const scored = relevant.map(slot => ({
    slot,
    numericScore: scoreSlotNumeric(slot, orientation, rockType),
  }));

  // Score global = meilleur score numérique observé
  let bestNumericScore = 0;
  for (const {numericScore} of scored) {
    if (numericScore > bestNumericScore) bestNumericScore = numericScore;
  }

  // Première fenêtre de créneaux "good" consécutifs
  let nextGoodWindow: SubSectorSummary['nextGoodWindow'] = null;
  let windowStart: number | null = null;

  for (let i = 0; i <= scored.length; i++) {
    const isGood = i < scored.length && scored[i].numericScore >= SCORE_WEIGHTS.THRESHOLD_GOOD;
    if (isGood && windowStart === null) {
      windowStart = i;
    } else if (!isGood && windowStart !== null) {
      const first = scored[windowStart].slot;
      const last  = scored[i - 1].slot;
      nextGoodWindow = {
        date: first.date,
        startHour: first.hour,
        endHour: last.hour + 1,
      };
      break;
    }
  }

  return {
    score: numericToWeatherScore(bestNumericScore),
    numericScore: bestNumericScore,
    nextGoodWindow,
  };
}
