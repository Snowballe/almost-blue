import axios from 'axios';
import {OPEN_METEO_API_BASE_URL} from '@env';
import {buildForecast} from '../utils/weatherLogic';
import {WeatherForecast} from '../types/weather';

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  windspeed_10m: number[];
  winddirection_10m?: number[];
  precipitation: number[];
  precipitation_probability?: number[];
  weathercode: number[];
}

const cache = new Map<string, {forecast: WeatherForecast; ts: number}>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

// Évite les requêtes dupliquées si plusieurs composants appellent
// getCachedForecast pour le même secteur avant que la première se termine.
const pending = new Map<string, Promise<WeatherForecast>>();

export async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<OpenMeteoHourly> {
  const {data} = await axios.get(`${OPEN_METEO_API_BASE_URL}/v1/forecast`, {
    params: {
      latitude,
      longitude,
      hourly: [
        'temperature_2m',
        'windspeed_10m',
        'winddirection_10m',
        'precipitation',
        'precipitation_probability',
        'weathercode',
      ].join(','),
      forecast_days: 3,
      timezone: 'Europe/Paris',
    },
  });

  // Valider que la réponse contient bien le champ attendu
  if (!data?.hourly?.time) {
    throw new Error('Open-Meteo : réponse invalide (champ hourly.time absent)');
  }

  return data.hourly as OpenMeteoHourly;
}

export async function getCachedForecast(
  latitude: number,
  longitude: number,
): Promise<WeatherForecast> {
  // Arrondi à 4 décimales (~11 m de précision) pour que deux appels avec
  // de légères variations de float (ex. 48.716648 vs 48.71664799) partagent
  // le même cache. Suffisant pour des secteurs hardcodés ou géolocalisés.
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

  // 1. Cache chaud → retour immédiat
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.forecast;
  }

  // 2. Requête déjà en vol pour ce secteur → partager la même promesse
  const inFlight = pending.get(key);
  if (inFlight) {
    return inFlight;
  }

  // 3. Lancer la requête et l'enregistrer comme "en vol"
  const promise = (async () => {
    try {
      const hourly = await fetchForecast(latitude, longitude);
      const forecast = buildForecast(hourly);
      cache.set(key, {forecast, ts: Date.now()});
      return forecast;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
}
