export type WeatherScore = 'good' | 'ok' | 'bad';

export interface WeatherSlot {
  date: string;
  hour: number;
  score: WeatherScore;
  temperature: number;
  windspeed: number;
  precipitation: number;
  reasons: string[];
}

export interface WeatherForecast {
  slots: WeatherSlot[];
  source: 'open-meteo' | 'meteoblue' | 'merged';
  fetchedAt: string;
}
