import {Sector} from '../types/sector';

export const sectors: Sector[] = [
  // NOTE : pour ajouter un site avec des expositions multiples très différentes
  // (ex. falaise E + face W distantes), créer deux Sector distincts plutôt
  // qu'un seul avec plusieurs SubSectors opposés.
  {
    id: 'pointe-de-primel',
    name: 'La Pointe de Primel',
    latitude: 48.716648,
    longitude: -3.817888,
    altitude: 15,
    notes:
      'Granit breton, cap continental. Accès à pied depuis le parking Primel-Trégastel. 3 grandes faces : Est, Ouest, Sud.',
    subSectors: [
      // ⚠️ Orientations A–L estimées — à corriger après inspection du plan de masse (page 8 topo 2003)
      {id: 'pointe-primel-defence-de-gerber',   name: 'Défence de Gerber',   orientation: 'W',  rockType: 'fast'},
      {id: 'pointe-primel-allons-z-enfants',    name: "Allons Z'enfants",    orientation: 'W',  rockType: 'fast'},
      {id: 'pointe-primel-siesta-latina',       name: 'Siesta Latina',       orientation: 'S',  rockType: 'fast'},
      {id: 'pointe-primel-defonce-granitique',  name: 'Défonce granitique',  orientation: 'S',  rockType: 'fast'},
      {id: 'pointe-primel-corps-marrant',       name: 'Corps marrant',       orientation: 'S',  rockType: 'fast'},
      {id: 'pointe-primel-liqueur-de-chairs',   name: 'Liqueur de chairs',   orientation: 'SW', rockType: 'fast'},
      {id: 'pointe-primel-mur-noir',            name: 'Le mur noir',         orientation: 'W',  rockType: 'fast'},
      {id: 'pointe-primel-le-nez',              name: 'Le nez',              orientation: 'NW', rockType: 'fast'},
      {id: 'pointe-primel-dalle-orange',        name: 'La Dalle orange',     orientation: 'E',  rockType: 'fast'},
      {id: 'pointe-primel-dalles-grises',       name: 'Dalles grises',       orientation: 'SE', rockType: 'fast'},
      {id: 'pointe-primel-se-kou-bomba',        name: 'Se Kou Bomba',        orientation: 'SE', rockType: 'fast'},
      {id: 'pointe-primel-y-a-basta',           name: "Y'a basta",           orientation: 'S',  rockType: 'fast'},
      // Secteurs ajoutés topo 2018 (M, N, O, P) — ⚠️ orientations estimées
      {id: 'pointe-primel-dauphin',             name: 'Dauphin',             orientation: 'S',  rockType: 'fast', notes: 'Blocs. Orientation estimée.'},
      {id: 'pointe-primel-la-comete',           name: 'La comète',           orientation: 'SE', rockType: 'fast', notes: "Blocs très techniques, souvent à l'abri du vent. Orientation estimée."},
      {id: 'pointe-primel-lsd',                 name: 'LSD',                 orientation: 'W',  rockType: 'fast', notes: 'Blocs athlétiques, secteur peu fréquenté. Orientation estimée.'},
      {id: 'pointe-primel-la-petite-provence',  name: 'La petite provence',  orientation: 'S',  rockType: 'fast', notes: 'Ensoleillé, voies + nombreux blocs. Orientation estimée.'},
    ],
  },

  {
    id: 'ile-de-primel',
    name: "L'Île de Primel",
    latitude: 48.719260,
    longitude: -3.822000,
    altitude: 48,
    notes:
      "Île tidale, accès par le Gouffre (marée : 2e h descente → 3e h montée). Retour possible vers la Pointe par rappel (technique). Granit breton, ambiance marine.",
    subSectors: [
      // Orientations : E/W/S/SW confirmées dans les topos ; N/NW/SE estimées
      {id: 'ile-primel-astragale',           name: 'Astragale',           orientation: 'E',  rockType: 'fast'},
      {id: 'ile-primel-saliere-de-la-sueur', name: 'Salière de la sueur', orientation: 'E',  rockType: 'fast', notes: 'Orientation estimée.'},
      {id: 'ile-primel-peggy-1',             name: 'Peggy 1',             orientation: 'N',  rockType: 'fast', notes: 'Orientation estimée.'},
      {id: 'ile-primel-peggy-2',             name: 'Peggy 2',             orientation: 'N',  rockType: 'fast', notes: 'Au-dessus du secteur 1 (Astragale). Orientation estimée.'},
      {id: 'ile-primel-dalles-grises',       name: 'Dalles grises',       orientation: 'W',  rockType: 'fast'},
      {id: 'ile-primel-cicciolina',          name: 'Cicciolina',          orientation: 'S',  rockType: 'fast'},
      {id: 'ile-primel-face-sud',            name: 'Face sud',            orientation: 'S',  rockType: 'fast'},
      {id: 'ile-primel-strip-pokes',         name: 'Strip Pokes',         orientation: 'S',  rockType: 'fast'},
      {id: 'ile-primel-dede-si-belle',       name: 'La Dédé si belle',    orientation: 'SW', rockType: 'fast'},
      {id: 'ile-primel-maximus',             name: 'Maximus',             orientation: 'SW', rockType: 'fast', notes: 'Orientation estimée. Absent du topo 2018.'},
      {id: 'ile-primel-grand-toit',          name: 'Grand toit',          orientation: 'W',  rockType: 'fast', notes: 'Orientation estimée.'},
      {id: 'ile-primel-saut-de-l-ange',     name: "Saut de l'ange",      orientation: 'NW', rockType: 'fast', notes: 'Orientation estimée.'},
      {id: 'ile-primel-mur-d-ocre',          name: "Le mur d'ocre",       orientation: 'W',  rockType: 'fast', notes: 'Orientation estimée.'},
      {id: 'ile-primel-ca-me-stimoule',      name: 'Ça me stimoule',      orientation: 'SW', rockType: 'fast'},
      {id: 'ile-primel-ecuador-sud',             name: 'Ecuador face Sud',             orientation: 'S',  rockType: 'fast'},
      {id: 'ile-primel-ecuador-est',             name: 'Ecuador face Est',             orientation: 'E',  rockType: 'fast'},
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
      {id: 'buoux-toit',      name: 'Le Toit',      orientation: 'S',  rockType: 'slow'},
      {id: 'buoux-dalle',     name: 'La Dalle',     orientation: 'SE', rockType: 'slow'},
      {id: 'buoux-surplombs', name: 'Les Surplombs', orientation: 'S', rockType: 'slow',
        notes: 'Dévers prononcé, bonne option par temps couvert.'},
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
      {id: 'verdon-luna-bong',    name: 'Luna Bong',      orientation: 'S', rockType: 'slow'},
      {id: 'verdon-df',           name: 'Dalle du Fond',  orientation: 'E', rockType: 'slow'},
      {id: 'verdon-rive-gauche',  name: 'Rive Gauche',    orientation: 'N', rockType: 'slow',
        notes: 'Ambiance fraîche, séchage lent.'},
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
      {id: 'morgiou-paroi-marine', name: 'Paroi Marine', orientation: 'S', rockType: 'slow'},
      {id: 'morgiou-tunnel',       name: 'Le Tunnel',    orientation: 'W', rockType: 'slow'},
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
      {id: 'galamus-rive-droite', name: 'Rive Droite', orientation: 'W', rockType: 'slow'},
      {id: 'galamus-rive-gauche', name: 'Rive Gauche', orientation: 'E', rockType: 'slow'},
    ],
  },
];

// ─── Sanity check (DEV uniquement) — unicité des IDs ─────────────────────────
if (__DEV__) {
  const allIds = [
    ...sectors.map(s => s.id),
    ...sectors.flatMap(s => s.subSectors.map(ss => ss.id)),
  ];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) {
      console.error(
        `[sectors] ⚠️ ID en double détecté : "${id}" — les lookups seront ambigus.`,
      );
    }
    seen.add(id);
  }
}
