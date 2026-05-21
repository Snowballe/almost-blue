import axios from 'axios';
import {METEOBLUE_API_BASE_URL, METEOBLUE_API_KEY} from '@env';

export function isMeteoblueEnabled(): boolean {
  return Boolean(METEOBLUE_API_KEY);
}

export async function fetchForecastMeteoblue(
  latitude: number,
  longitude: number,
): Promise<unknown | null> {
  if (!isMeteoblueEnabled()) {
    return null;
  }
  const {data} = await axios.get(
    `${METEOBLUE_API_BASE_URL}/packages/basic-1h`,
    {
      params: {apikey: METEOBLUE_API_KEY, lat: latitude, lon: longitude, format: 'json'},
    },
  );
  return data;
}
