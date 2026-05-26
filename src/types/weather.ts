export type WeatherScore = 'good' | 'ok' | 'bad';

export interface WeatherSlot {
  date: string;
  hour: number;
  /** Score de base, sans prise en compte de l'orientation du sous-secteur. */
  score: WeatherScore;
  temperature: number;
  windspeed: number;
  /** Direction d'où vient le vent, en degrés météo (0° = N, 90° = E…) */
  windDirection: number;
  precipitation: number;
  precipProbability: number;
  weatherCode: number;
  /** Indique si une pluie significative est tombée dans les 12h précédentes. */
  recentRain: boolean;
  reasons: string[];
}

export interface SubSectorSummary {
  score: WeatherScore;
  /**
   * Première fenêtre de créneaux consécutifs "good" dans les 48h.
   * null si aucune fenêtre favorable trouvée.
   */
  nextGoodWindow: {date: string; startHour: number; endHour: number} | null;
}

export interface WeatherForecast {
  slots: WeatherSlot[];
  source: 'open-meteo' | 'meteoblue' | 'merged';
  fetchedAt: string;
}
