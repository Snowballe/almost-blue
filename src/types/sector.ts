export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface SubSector {
  id: string;
  name: string;
  orientation: Orientation;
  notes?: string;
}

export interface Sector {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  notes?: string;
  subSectors: SubSector[];
}
