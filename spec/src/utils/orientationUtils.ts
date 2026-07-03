import {Orientation} from '../types/sector';

/** Affichage court avec flèche directionnelle — pour l'UI (badge, liste). */
export const ORIENTATION_LABEL: Record<Orientation, string> = {
  N:  '↑ N',
  NE: '↗ NE',
  E:  '→ E',
  SE: '↘ SE',
  S:  '↓ S',
  SW: '↙ SW',
  W:  '← W',
  NW: '↖ NW',
};

/** Nom complet en français — pour les messages de notification. */
export const ORIENTATION_FR: Record<Orientation, string> = {
  N:  'Nord',
  NE: 'Nord-Est',
  E:  'Est',
  SE: 'Sud-Est',
  S:  'Sud',
  SW: 'Sud-Ouest',
  W:  'Ouest',
  NW: 'Nord-Ouest',
};
