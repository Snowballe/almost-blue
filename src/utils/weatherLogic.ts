import {OpenMeteoHourly} from '../services/openMeteo';
import {WeatherForecast, WeatherSlot, WeatherScore} from '../types/weather';
import {Orientation} from '../types/sector';

const MIN_TEMP = 5;
const MAX_PRECIP = 0.5;
const MIN_WIND_AFTER_RAIN = 15;
const DRYING_LOOKBACK_HOURS = 12;

// North-facing walls are colder and dry slower → raise the effective min temp.
// South-facing walls get more sun → lower it slightly.
const ORIENTATION_TEMP_ADJUST: Record<Orientation, number> = {
  N: 4,
  NE: 3,
  NW: 2,
  E: 0,
  W: 0,
  SE: -1,
  S: -2,
  SW: -2,
};

function scoreSlot(
  i: number,
  hourly: OpenMeteoHourly,
  tempAdjust = 0,
): {score: WeatherScore; reasons: string[]} {
  const reasons: string[] = [];
  const temp = hourly.temperature_2m[i];
  const wind = hourly.windspeed_10m[i];
  const precip = hourly.precipitation[i];

  if (precip > MAX_PRECIP) {
    return {score: 'bad', reasons: [`Précipitations (${precip}mm/h)`]};
  }

  const effectiveMinTemp = MIN_TEMP + tempAdjust;
  if (temp < effectiveMinTemp) {
    reasons.push(`Température trop basse (${temp}°C)`);
  }

  const start = Math.max(0, i - DRYING_LOOKBACK_HOURS);
  const recentRain = hourly.precipitation
    .slice(start, i)
    .some(p => p > MAX_PRECIP);

  if (recentRain && wind < MIN_WIND_AFTER_RAIN) {
    reasons.push(`Rocher humide, vent insuffisant pour séchage (${wind}km/h)`);
  }

  const score: WeatherScore =
    reasons.length === 0 ? 'good' : reasons.length === 1 ? 'ok' : 'bad';
  return {score, reasons};
}

export function buildForecast(hourly: OpenMeteoHourly): WeatherForecast {
  const slots: WeatherSlot[] = hourly.time.map((t, i) => {
    const date = t.slice(0, 10);
    const hour = parseInt(t.slice(11, 13), 10);
    const {score, reasons} = scoreSlot(i, hourly);
    return {
      date,
      hour,
      score,
      temperature: hourly.temperature_2m[i],
      windspeed: hourly.windspeed_10m[i],
      precipitation: hourly.precipitation[i],
      reasons,
    };
  });

  return {slots, source: 'open-meteo', fetchedAt: new Date().toISOString()};
}

// Returns the best weather score for a sub-sector over the next 48h of daylight (7h–20h),
// factoring in the orientation's temperature modifier.
export function getSubSectorSummary(
  forecast: WeatherForecast,
  orientation: Orientation,
): WeatherScore {
  const tempAdjust = ORIENTATION_TEMP_ADJUST[orientation];
  const now = Date.now();
  const cutoff = now + 48 * 60 * 60 * 1000;

  const relevant = forecast.slots.filter(slot => {
    if (slot.hour < 7 || slot.hour > 20) return false;
    const ts = new Date(`${slot.date}T${String(slot.hour).padStart(2, '0')}:00`).getTime();
    return ts > now && ts < cutoff;
  });

  if (relevant.length === 0) return 'bad';

  // Apply orientation adjustment: if a slot was borderline ok, it may flip.
  const adjust = (slot: WeatherSlot): WeatherScore => {
    if (slot.score === 'bad') return 'bad';
    if (slot.temperature < MIN_TEMP + tempAdjust) {
      return slot.score === 'good' ? 'ok' : 'bad';
    }
    return slot.score;
  };

  const scores = relevant.map(adjust);
  if (scores.some(s => s === 'good')) return 'good';
  if (scores.some(s => s === 'ok')) return 'ok';
  return 'bad';
}
