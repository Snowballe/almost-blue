import {Sector} from '../types/sector';

export const sectors: Sector[] = [
  {
    id: 'primel',
    name: 'Pointe de Primel',
    latitude: 48.7054,
    longitude: -3.8195,
    altitude: 30,
    notes: 'Granit breton, accès à pied depuis le parking Primel-Trégastel.',
    subSectors: [
      {
        id: 'primel-ile',
        name: "L'Île",
        orientation: 'SW',
        notes: 'Dalle SW, sèche rapidement après la pluie.',
      },
      {
        id: 'primel-aretes',
        name: 'Les Arêtes',
        orientation: 'W',
      },
      {
        id: 'primel-mer',
        name: 'Face Mer',
        orientation: 'N',
        notes: 'Exposition plein nord, humide hors été.',
      },
    ],
  },
  {
    id: 'buoux',
    name: 'Falaise de Buoux',
    latitude: 43.8297,
    longitude: 5.5803,
    altitude: 400,
    notes: 'Calcaire classique du Luberon, voies de tous niveaux 5b–8c.',
    subSectors: [
      {id: 'buoux-toit', name: 'Le Toit', orientation: 'S'},
      {id: 'buoux-dalle', name: 'La Dalle', orientation: 'SE'},
      {
        id: 'buoux-surplombs',
        name: 'Les Surplombs',
        orientation: 'S',
        notes: 'Dévers prononcé, bonne option par temps couvert.',
      },
    ],
  },
  {
    id: 'verdon-escalès',
    name: 'Verdon — Escalès',
    latitude: 43.7693,
    longitude: 6.3956,
    altitude: 900,
    notes: 'Grand canyon calcaire, grandes voies engagées. Prévoir matériel de rappel.',
    subSectors: [
      {id: 'verdon-luna-bong', name: 'Luna Bong', orientation: 'S'},
      {id: 'verdon-df', name: 'Dalle du Fond', orientation: 'E'},
      {
        id: 'verdon-rive-gauche',
        name: 'Rive Gauche',
        orientation: 'N',
        notes: 'Ambiance fraîche, séchage lent.',
      },
    ],
  },
  {
    id: 'calanques-morgiou',
    name: 'Calanques — Morgiou',
    latitude: 43.2172,
    longitude: 5.4477,
    altitude: 0,
    notes: 'Calcaire maritime, accès à pied (1h) ou par mer. Fermeture estivale possible.',
    subSectors: [
      {id: 'morgiou-paroi-marine', name: 'Paroi Marine', orientation: 'S'},
      {id: 'morgiou-tunnel', name: 'Le Tunnel', orientation: 'W'},
    ],
  },
  {
    id: 'galamus',
    name: 'Gorges de Galamus',
    latitude: 42.8367,
    longitude: 2.57,
    altitude: 350,
    notes: 'Calcaire des Corbières, voies sportives engagées. Route étroite.',
    subSectors: [
      {id: 'galamus-rive-droite', name: 'Rive Droite', orientation: 'W'},
      {id: 'galamus-rive-gauche', name: 'Rive Gauche', orientation: 'E'},
    ],
  },
];
