export interface Crag {
  id: number;
  name: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  sport_climbing: boolean;
  bouldering: boolean;
  multi_pitch: boolean;
  trad_climbing: boolean;
  slug_name: string;
}
