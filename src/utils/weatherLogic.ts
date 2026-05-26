import {OpenMeteoHourly} from '../services/openMeteo';
import {
  WeatherForecast,
  WeatherSlot,
  WeatherScore,
  SubSectorSummary,
} from '../types/weather';
import {Orientation} from '../types/sector';

// ─── Seuils ──────────────────────────────────────────────────────────────────

const MIN_TEMP = 5;               // °C en dessous duquel on ne grimpe pas
const MAX_PRECIP = 0.5;           // mm/h — précipitation active
const MIN_WIND_DRYING = 15;       // km/h — vent minimum pour sécher en face exposée
const DRYING_LOOKBACK_H = 12;     // heures de lookback pour la pluie récente
const PRECIP_PROB_WARN = 60;      // % — probabilité de pluie déclenchant un warning
const PRECIP_PROB_BAD  = 80;      // % — probabilité de pluie → bad

// Codes WMO mauvais temps (orages, grosses pluies, neige)
const BAD_WEATHER_CODES = new Set([
  55, 57,                          // bruine forte / bruine verglaçante
  63, 65, 67,                      // pluie modérée / forte / pluie verglaçante
  73, 75, 77,                      // neige modérée / forte / grésil
  81, 82,                          // averses fortes
  85, 86,                          // averses de neige modérée / forte
  95, 96, 99,                      // orage
]);

// ─── Orientation → correctif température ─────────────────────────────────────

/**
 * Correctif appliqué à MIN_TEMP pour tenir compte de l'ensoleillement
 * de la paroi. Une face N est plus froide (seuil relevé), une face S
 * est plus chaude (seuil abaissé).
 */
const ORIENTATION_TEMP_ADJUST: Record<Orientation, number> = {
  N:  4,
  NE: 3,
  NW: 2,
  E:  0,
  W:  0,
  SE: -1,
  S:  -2,
  SW: -2,
};

// ─── Orientation → degrés (convention météo : d'où vient le vent) ────────────

const ORIENTATION_DEG: Record<Orientation, number> = {
  N:   0,
  NE:  45,
  E:   90,
  SE:  135,
  S:   180,
  SW:  225,
  W:   270,
  NW:  315,
};

// ─── Exposition vent / paroi ──────────────────────────────────────────────────

type WindExposure = 'exposed' | 'side' | 'sheltered';

/**
 * Calcule l'angle entre la direction d'où vient le vent et la normale
 * à la paroi (= orientation de la face).
 *
 * - exposed  : vent de face (± 60°) → évaporation forcée
 * - side     : vent de côté (60°–120°)
 * - sheltered: vent dans le dos (> 120°) → séchage lent
 */
function getWindExposure(windDir: number, orientation: Orientation): WindExposure {
  const wallDeg = ORIENTATION_DEG[orientation];
  let diff = Math.abs(windDir - wallDeg) % 360;
  if (diff > 180) diff = 360 - diff;
  if (diff <= 60)  return 'exposed';
  if (diff <= 120) return 'side';
  return 'sheltered';
}

// ─── Score d'un créneau (avec contexte d'orientation) ────────────────────────

/**
 * Score un créneau horaire en tenant compte de :
 * - la pluie en cours et la pluie récente (lookback 12h)
 * - la direction + vitesse du vent par rapport à la paroi
 * - la température effective (avec correctif d'orientation)
 * - la probabilité de précipitations
 * - les codes WMO (orages, grosses pluies, neige)
 */
function scoreSlotForOrientation(
  slot: WeatherSlot,
  orientation: Orientation,
): {score: WeatherScore; reasons: string[]} {
  const reasons: string[] = [];

  // 1. Précipitations actives — bad immédiat
  if (slot.precipitation > MAX_PRECIP) {
    return {score: 'bad', reasons: [`Précipitations (${slot.precipitation.toFixed(1)}mm/h)`]};
  }

  // 2. Codes WMO mauvais temps — bad immédiat
  if (BAD_WEATHER_CODES.has(slot.weatherCode)) {
    return {score: 'bad', reasons: [`Conditions météo défavorables (code ${slot.weatherCode})`]};
  }

  // 3. Probabilité de pluie élevée
  if (slot.precipProbability >= PRECIP_PROB_BAD) {
    return {score: 'bad', reasons: [`Risque de pluie élevé (${slot.precipProbability}%)`]};
  }
  if (slot.precipProbability >= PRECIP_PROB_WARN) {
    reasons.push(`Risque de pluie (${slot.precipProbability}%)`);
  }

  // 4. Température effective (correctif selon orientation)
  const tempAdjust = ORIENTATION_TEMP_ADJUST[orientation];
  const effectiveMinTemp = MIN_TEMP + tempAdjust;
  if (slot.temperature < effectiveMinTemp) {
    reasons.push(`Température trop basse (${slot.temperature.toFixed(0)}°C)`);
  }

  // 5. Pluie récente × exposition au vent
  //    C'est le critère le plus important pour l'escalade outdoor.
  if (slot.recentRain) {
    const exposure = getWindExposure(slot.windDirection, orientation);
    if (exposure === 'exposed' && slot.windspeed >= MIN_WIND_DRYING) {
      // Vent de face suffisant → séchage actif → pas de malus
    } else if (exposure === 'exposed' && slot.windspeed < MIN_WIND_DRYING) {
      reasons.push(
        `Pluie récente — face exposée mais vent faible (${slot.windspeed.toFixed(0)}km/h)`,
      );
    } else if (exposure === 'side') {
      reasons.push(
        `Pluie récente — vent de côté, séchage modéré (${slot.windspeed.toFixed(0)}km/h)`,
      );
    } else {
      // sheltered — vent dans le dos, séchage très lent
      reasons.push(`Pluie récente — paroi abritée du vent, séchage lent`);
    }
  }

  const score: WeatherScore =
    reasons.length === 0 ? 'good' : reasons.length === 1 ? 'ok' : 'bad';
  return {score, reasons};
}

// ─── Construction du forecast brut (sans orientation) ────────────────────────

/**
 * Transforme la réponse horaire Open-Meteo en WeatherForecast.
 * Les slots contiennent toutes les données brutes nécessaires au re-scoring
 * par orientation dans getSubSectorSummary.
 *
 * Le `score` du slot est calculé sans orientation (tempAdjust = 0, vent neutre)
 * et sert d'estimation générique pour l'affichage sur la carte.
 */
export function buildForecast(hourly: OpenMeteoHourly): WeatherForecast {
  const slots: WeatherSlot[] = hourly.time.map((t, i) => {
    const date = t.slice(0, 10);
    const hour = parseInt(t.slice(11, 13), 10);

    const precipitation = hourly.precipitation[i] ?? 0;
    const precipProbability = hourly.precipitation_probability?.[i] ?? 0;
    const weatherCode = hourly.weathercode[i] ?? 0;
    const windspeed = hourly.windspeed_10m[i] ?? 0;
    const windDirection = hourly.winddirection_10m?.[i] ?? 0;
    const temperature = hourly.temperature_2m[i] ?? 0;

    const start = Math.max(0, i - DRYING_LOOKBACK_H);
    const recentRain = hourly.precipitation
      .slice(start, i)
      .some(p => p > MAX_PRECIP);

    // Score générique (sans correctif d'orientation) pour les pins de la carte
    let baseScore: WeatherScore = 'good';
    if (precipitation > MAX_PRECIP || BAD_WEATHER_CODES.has(weatherCode)) {
      baseScore = 'bad';
    } else if (precipProbability >= PRECIP_PROB_BAD) {
      baseScore = 'bad';
    } else if (precipProbability >= PRECIP_PROB_WARN || recentRain) {
      baseScore = 'ok';
    } else if (temperature < MIN_TEMP) {
      baseScore = 'ok';
    }

    return {
      date,
      hour,
      score: baseScore,
      temperature,
      windspeed,
      windDirection,
      precipitation,
      precipProbability,
      weatherCode,
      recentRain,
      reasons: [],
    };
  });

  return {slots, source: 'open-meteo', fetchedAt: new Date().toISOString()};
}

// ─── Résumé par sous-secteur ──────────────────────────────────────────────────

/**
 * Calcule le score d'un sous-secteur sur les 48 prochaines heures de jour
 * (7h–20h) en tenant compte de l'orientation de la paroi.
 *
 * Retourne aussi la première fenêtre de créneaux "good" consécutifs pour
 * permettre à l'UI d'afficher "Mer. 14h–18h ✅" plutôt qu'un simple badge.
 */
export function getSubSectorSummary(
  forecast: WeatherForecast,
  orientation: Orientation,
): SubSectorSummary {
  const now = Date.now();
  const cutoff = now + 48 * 60 * 60 * 1000;

  const relevant = forecast.slots.filter(slot => {
    if (slot.hour < 7 || slot.hour > 20) return false;
    const ts = new Date(
      `${slot.date}T${String(slot.hour).padStart(2, '0')}:00`,
    ).getTime();
    return ts > now && ts < cutoff;
  });

  if (relevant.length === 0) return {score: 'bad', nextGoodWindow: null};

  // Re-score chaque créneau avec l'orientation de cette paroi
  const scored = relevant.map(slot => ({
    slot,
    ...scoreSlotForOrientation(slot, orientation),
  }));

  // Score global = meilleur score observé
  let overallScore: WeatherScore = 'bad';
  for (const {score} of scored) {
    if (score === 'good') { overallScore = 'good'; break; }
    if (score === 'ok')     overallScore = 'ok';
  }

  // Première fenêtre de créneaux "good" consécutifs (min 1 créneau)
  let nextGoodWindow: SubSectorSummary['nextGoodWindow'] = null;
  let windowStart: number | null = null;

  for (let i = 0; i <= scored.length; i++) {
    const isGood = i < scored.length && scored[i].score === 'good';
    if (isGood && windowStart === null) {
      windowStart = i;
    } else if (!isGood && windowStart !== null) {
      const first = scored[windowStart].slot;
      const last  = scored[i - 1].slot;
      nextGoodWindow = {
        date: first.date,
        startHour: first.hour,
        endHour:   last.hour,
      };
      break;
    }
  }

  return {score: overallScore, nextGoodWindow};
}
