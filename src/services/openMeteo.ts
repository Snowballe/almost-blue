import axios from 'axios';
import {OPEN_METEO_API_BASE_URL} from '@env';

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: number[];
  windspeed_10m: number[];
  precipitation: number[];
  weathercode: number[];
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
): Promise<OpenMeteoHourly> {
  const {data} = await axios.get(`${OPEN_METEO_API_BASE_URL}/v1/forecast`, {
    params: {
      latitude,
      longitude,
      hourly:
        'temperature_2m,windspeed_10m,precipitation,weathercode,precipitation_probability',
      forecast_days: 3,
      timezone: 'Europe/Paris',
    },
  });
  return data.hourly;
}
