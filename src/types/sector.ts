export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface SubSector {
  id: string;
  name: string;
  orientation: Orientation;
  /** Granite/grès (fast) sèche en quelques heures ; calcaire/conglomérat (slow) peut suinter 24h+. */
  rockType: 'fast' | 'slow';
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
