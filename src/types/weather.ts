export type WeatherScore = 'good' | 'ok' | 'bad';

export interface WeatherSlot {
  date: string;
  hour: number;
  /** Score dérivé du numericScore (pour les pins de la carte). */
  score: WeatherScore;
  /** Score numérique additif, de 0 à 10. */
  numericScore: number;
  temperature: number;
  windspeed: number;
  /** Direction d'où vient le vent, en degrés météo (0° = N, 90° = E…) */
  windDirection: number;
  precipitation: number;
  precipProbability: number;
  weatherCode: number;
  /** mm de pluie cumulés sur les 6h précédentes (fenêtre roche rapide). */
  recentRainMm6h: number;
  /** mm de pluie cumulés sur les 24h précédentes (fenêtre roche lente). */
  recentRainMm24h: number;
}

export interface SubSectorSummary {
  score: WeatherScore;
  /** Score numérique du meilleur créneau dans la fenêtre de 72h. */
  numericScore: number;
  /**
   * Première fenêtre de créneaux consécutifs "good" dans les 72h.
   * null si aucune fenêtre favorable trouvée.
   */
  nextGoodWindow: {date: string; startHour: number; endHour: number} | null;
}

export interface WeatherForecast {
  slots: WeatherSlot[];
  source: 'open-meteo' | 'meteoblue' | 'merged';
  fetchedAt: string;
}
