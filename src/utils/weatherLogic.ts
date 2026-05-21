import {OpenMeteoHourly} from '../services/openMeteo';
import {WeatherForecast, WeatherSlot, WeatherScore} from '../types/weather';

const MIN_TEMP = 5;
const MAX_PRECIP = 0.5;
const MIN_WIND_AFTER_RAIN = 15;
const DRYING_LOOKBACK_HOURS = 12;

function scoreSlot(
  i: number,
  hourly: OpenMeteoHourly,
): {score: WeatherScore; reasons: string[]} {
  const reasons: string[] = [];
  const temp = hourly.temperature_2m[i];
  const wind = hourly.windspeed_10m[i];
  const precip = hourly.precipitation[i];

  if (precip > MAX_PRECIP) {
    return {score: 'bad', reasons: [`Précipitations (${precip}mm/h)`]};
  }

  if (temp < MIN_TEMP) {
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
