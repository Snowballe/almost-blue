package com.almostblue.data

import com.almostblue.domain.Orientation.E
import com.almostblue.domain.Orientation.N
import com.almostblue.domain.Orientation.NE
import com.almostblue.domain.Orientation.NW
import com.almostblue.domain.Orientation.S
import com.almostblue.domain.Orientation.SE
import com.almostblue.domain.Orientation.SW
import com.almostblue.domain.Orientation.W
import com.almostblue.domain.RockType.FAST
import com.almostblue.domain.RockType.SLOW

/**
 * Topos saisis à la main — transcription 1:1 de spec/src/data/sectors.ts.
 * Pas d'API secteurs, pas d'UI d'ajout. L'unicité des IDs est garantie par
 * SectorsTest (l'équivalent du sanity-check __DEV__ du TS).
 *
 * NOTE : pour ajouter un site avec des expositions multiples très différentes
 * (ex. falaise E + face W distantes), créer deux Sector distincts plutôt
 * qu'un seul avec plusieurs SubSectors opposés.
 */
val sectors: List<Sector> = listOf(
    Sector(
        id = "pointe-de-primel",
        name = "La Pointe de Primel",
        latitude = 48.716648,
        longitude = -3.817888,
        altitude = 15,
        notes = "Granit breton, cap continental. Accès à pied depuis le parking Primel-Trégastel. 3 grandes faces : Est, Ouest, Sud.",
        subSectors = listOf(
            // ⚠️ Orientations A–L estimées — à corriger après inspection du plan de masse (page 8 topo 2003)
            SubSector("pointe-primel-defence-de-gerber", "Défence de Gerber", W, FAST),
            SubSector("pointe-primel-allons-z-enfants", "Allons Z'enfants", W, FAST),
            SubSector("pointe-primel-siesta-latina", "Siesta Latina", S, FAST),
            SubSector("pointe-primel-defonce-granitique", "Défonce granitique", S, FAST),
            SubSector("pointe-primel-corps-marrant", "Corps marrant", S, FAST),
            SubSector("pointe-primel-liqueur-de-chairs", "Liqueur de chairs", SW, FAST),
            SubSector("pointe-primel-mur-noir", "Le mur noir", W, FAST),
            SubSector("pointe-primel-le-nez", "Le nez", NW, FAST),
            SubSector("pointe-primel-dalle-orange", "La Dalle orange", E, FAST),
            SubSector("pointe-primel-dalles-grises", "Dalles grises", SE, FAST),
            SubSector("pointe-primel-se-kou-bomba", "Se Kou Bomba", SE, FAST),
            SubSector("pointe-primel-y-a-basta", "Y'a basta", S, FAST),
            // Secteurs ajoutés topo 2018 (M, N, O, P) — ⚠️ orientations estimées
            SubSector("pointe-primel-dauphin", "Dauphin", S, FAST, notes = "Blocs. Orientation estimée."),
            SubSector("pointe-primel-la-comete", "La comète", SE, FAST, notes = "Blocs très techniques, souvent à l'abri du vent. Orientation estimée."),
            SubSector("pointe-primel-lsd", "LSD", W, FAST, notes = "Blocs athlétiques, secteur peu fréquenté. Orientation estimée."),
            SubSector("pointe-primel-la-petite-provence", "La petite provence", S, FAST, notes = "Ensoleillé, voies + nombreux blocs. Orientation estimée."),
        ),
    ),

    Sector(
        id = "ile-de-primel",
        name = "L'Île de Primel",
        latitude = 48.719260,
        longitude = -3.822000,
        altitude = 48,
        notes = "Île tidale, accès par le Gouffre (marée : 2e h descente → 3e h montée). Retour possible vers la Pointe par rappel (technique). Granit breton, ambiance marine.",
        subSectors = listOf(
            // Orientations : E/W/S/SW confirmées dans les topos ; N/NW/SE estimées
            SubSector("ile-primel-astragale", "Astragale", E, FAST),
            SubSector("ile-primel-saliere-de-la-sueur", "Salière de la sueur", E, FAST, notes = "Orientation estimée."),
            SubSector("ile-primel-peggy-1", "Peggy 1", N, FAST, notes = "Orientation estimée."),
            SubSector("ile-primel-peggy-2", "Peggy 2", N, FAST, notes = "Au-dessus du secteur 1 (Astragale). Orientation estimée."),
            SubSector("ile-primel-dalles-grises", "Dalles grises", W, FAST),
            SubSector("ile-primel-cicciolina", "Cicciolina", S, FAST),
            SubSector("ile-primel-face-sud", "Face sud", S, FAST),
            SubSector("ile-primel-strip-pokes", "Strip Pokes", S, FAST),
            SubSector("ile-primel-dede-si-belle", "La Dédé si belle", SW, FAST),
            SubSector("ile-primel-maximus", "Maximus", SW, FAST, notes = "Orientation estimée. Absent du topo 2018."),
            SubSector("ile-primel-grand-toit", "Grand toit", W, FAST, notes = "Orientation estimée."),
            SubSector("ile-primel-saut-de-l-ange", "Saut de l'ange", NW, FAST, notes = "Orientation estimée."),
            SubSector("ile-primel-mur-d-ocre", "Le mur d'ocre", W, FAST, notes = "Orientation estimée."),
            SubSector("ile-primel-ca-me-stimoule", "Ça me stimoule", SW, FAST),
            SubSector("ile-primel-ecuador-sud", "Ecuador face Sud", S, FAST),
            SubSector("ile-primel-ecuador-est", "Ecuador face Est", E, FAST),
        ),
    ),

    Sector(
        id = "pen-hir",
        name = "Pointe de Pen-Hir",
        latitude = 48.258449,
        longitude = -4.621312,
        altitude = 50,
        notes = "Quartzite (grès armoricain), ambiance marine engagée. Accès 90 % des voies en rappel — maîtriser la manœuvre. Attention marée et houle sur les secteurs bas.",
        subSectors = listOf(
            // ── Face W ─────────────────────────────────────────────────────
            SubSector("pen-hir-grande-falaise", "Grande falaise", W, FAST,
                notes = "Falaise principale, 40-70 m. Voies d'aventure (65 %). 90 % accès en rappel."),
            SubSector("pen-hir-dalle-de-paul", "Dalle de Paul", W, FAST),
            SubSector("pen-hir-dalle-blanche", "Dalle blanche", W, FAST),
            SubSector("pen-hir-dalle-noire-ys", "Dalle noire / Ys", W, FAST),
            SubSector("pen-hir-dalle-aux-obus", "Dalle aux obus", W, FAST),
            SubSector("pen-hir-cirque-courants-d-air", "Cirque des courants d'air", W, FAST),
            SubSector("pen-hir-arche-de-noe", "Arche de Noé", W, FAST),
            // ── Face NW ────────────────────────────────────────────────────
            SubSector("pen-hir-dalle-grise", "Dalle grise", NW, FAST),
            SubSector("pen-hir-gwen-ha-du", "Gwen ha du", NW, FAST),
            SubSector("pen-hir-dalle-des-pecheurs", "Dalle des pêcheurs", NW, FAST),
            // ── Face N ─────────────────────────────────────────────────────
            SubSector("pen-hir-menhir", "Menhir", N, FAST,
                notes = "Accès par rappels obligatoires (végétation fragile). Orientation multiple (N, E, O)."),
            SubSector("pen-hir-chateau-de-cartes", "Le château de cartes", N, FAST),
            SubSector("pen-hir-face-nord", "Face nord", N, SLOW),
            // ── Face NE ────────────────────────────────────────────────────
            SubSector("pen-hir-banquise", "Banquise", NE, FAST),
            // ── Face E ─────────────────────────────────────────────────────
            SubSector("pen-hir-crique", "La crique", E, FAST),
            SubSector("pen-hir-dalle-des-debutants", "Dalle des débutants", E, FAST,
                notes = "23 voies, 10-25 m, 3b-5b. Casque obligatoire (chutes de pierres fréquentes). Suivre sentiers balisés."),
            SubSector("pen-hir-grand-daouet", "Le grand Daouët", E, FAST,
                notes = "Pilier isolé. Descente en rappel, attention marée & oiseaux (nidification)."),
            // ── Face S ─────────────────────────────────────────────────────
            SubSector("pen-hir-quai-des-brumes", "Quai des brumes", S, FAST),
            // ── Face SW ────────────────────────────────────────────────────
            SubSector("pen-hir-batardes", "Les bâtardes", SW, FAST),
            SubSector("pen-hir-breche", "La brèche", SW, FAST, notes = "Descente en rappel, attention à la marée."),
            SubSector("pen-hir-grande-faille", "La grande faille", SW, FAST),
            SubSector("pen-hir-toons-land", "Toon's land", SW, FAST),
        ),
    ),

    Sector(
        id = "buoux",
        name = "Falaise de Buoux",
        latitude = 43.8297,
        longitude = 5.5803,
        altitude = 400,
        notes = "Calcaire classique du Luberon, voies de tous niveaux 5b–8c.",
        subSectors = listOf(
            SubSector("buoux-toit", "Le Toit", S, SLOW),
            SubSector("buoux-dalle", "La Dalle", SE, SLOW),
            SubSector("buoux-surplombs", "Les Surplombs", S, SLOW,
                notes = "Dévers prononcé, bonne option par temps couvert."),
        ),
    ),

    Sector(
        id = "verdon-escalès",
        name = "Verdon — Escalès",
        latitude = 43.7693,
        longitude = 6.3956,
        altitude = 900,
        notes = "Grand canyon calcaire, grandes voies engagées. Prévoir matériel de rappel.",
        subSectors = listOf(
            SubSector("verdon-luna-bong", "Luna Bong", S, SLOW),
            SubSector("verdon-df", "Dalle du Fond", E, SLOW),
            SubSector("verdon-rive-gauche", "Rive Gauche", N, SLOW,
                notes = "Ambiance fraîche, séchage lent."),
        ),
    ),

    Sector(
        id = "calanques-morgiou",
        name = "Calanques — Morgiou",
        latitude = 43.2172,
        longitude = 5.4477,
        altitude = 0,
        notes = "Calcaire maritime, accès à pied (1h) ou par mer. Fermeture estivale possible.",
        subSectors = listOf(
            SubSector("morgiou-paroi-marine", "Paroi Marine", S, SLOW),
            SubSector("morgiou-tunnel", "Le Tunnel", W, SLOW),
        ),
    ),

    Sector(
        id = "galamus",
        name = "Gorges de Galamus",
        latitude = 42.8367,
        longitude = 2.57,
        altitude = 350,
        notes = "Calcaire des Corbières, voies sportives engagées. Route étroite.",
        subSectors = listOf(
            SubSector("galamus-rive-droite", "Rive Droite", W, SLOW),
            SubSector("galamus-rive-gauche", "Rive Gauche", E, SLOW),
        ),
    ),

    Sector(
        id = "imperatrice-plougastel",
        name = "L'Impératrice",
        latitude = 48.388395,   // ⚠️ À remplacer par les vraies coordonnées GPS
        longitude = -4.376536,  // ⚠️ À remplacer par les vraies coordonnées GPS
        altitude = 80, // estimation — falaise dans les bois de Plougastel (~80 m NGF)
        notes = "Granit breton, Plougastel-Daoulas (29). Terrain privé — comportement respectueux " +
            "exigé (pas de feu, bivouac, camping). Accès depuis Brest : RN 165 dir. Quimper → " +
            "après le pont de l'Iroise, 2e sortie Plougastel → rond-point dir. 'Toull Ar Rohou'. " +
            "Parking 50 m après la patte d'oie, chemin d'accès 50 m plus bas. Topo CAF Brest 2003.",
        subSectors = listOf(
            SubSector("imperatrice-grand-toit", "Grand Toit", NW, FAST,
                notes = "35 m, 12 voies 4–8b. Les voies les plus dures du site."),
            SubSector("imperatrice-jy-va-ty", "J'y va t'y", NW, FAST,
                notes = "40 m, 11 voies 4–7b."),
            SubSector("imperatrice-fer-a-cheval", "Fer à Cheval", NW, FAST,
                notes = "35 m, 12 voies 4–6c+."),
            SubSector("imperatrice-trou-de-godille", "Trou de Godille", W, FAST,
                notes = "35 m, 4 voies 4–6a. Certains relais équipés."),
            SubSector("imperatrice-feuilles-mortes", "Feuilles Mortes", SW, FAST,
                notes = "20 m, 3 voies 5–5+. Relais ré-équipé au sommet."),
            SubSector("imperatrice-initiation", "Initiation", SE, FAST,
                notes = "20 m, 14 voies 3–7a (secteurs 1 & 2). Idéal débutants."),
            SubSector("imperatrice-arbre-foudroye", "Arbre Foudroyé", NW, FAST,
                notes = "8 m, 4 voies 4–6c. Accès par le sentier contournant l'Impératrice côté sud. Vue sur la rade de Brest."),
            SubSector("imperatrice-le-fennec", "Le Fennec", NE, FAST,
                notes = "12 m, 5 voies 6a–7a+. Dalle en léger dévers. Orientation NNE dans le topo → NE."),
        ),
    ),
)
