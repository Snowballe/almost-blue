import axios from 'axios';
import {OPEN_METEO_API_BASE_URL} from '@env';
import {buildForecast} from '../utils/weatherLogic';
import {WeatherForecast} from '../types/weather';

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  windspeed_10m: number[];
  winddirection_10m: number[];
  precipitation: number[];
  precipitation_probability: number[];
  weathercode: number[];
}

const cache = new Map<string, {forecast: WeatherForecast; ts: number}>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

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
  return data.hourly;
}

export async function getCachedForecast(
  latitude: number,
  longitude: number,
): Promise<WeatherForecast> {
  const key = `${latitude},${longitude}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.forecast;
  }
  const hourly = await fetchForecast(latitude, longitude);
  const forecast = buildForecast(hourly);
  cache.set(key, {forecast, ts: Date.now()});
  return forecast;
}
