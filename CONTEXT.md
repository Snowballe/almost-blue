# Contexte du projet Almost Blue

## Concept

Application React Native qui alerte les grimpeurs outdoor quand une fenêtre météo favorable s'ouvre sur leurs secteurs d'escalade suivis, hors saison estivale.

## État d'avancement (v1.3 — Android)

- ✅ Projet initialisé (RN 0.82 + TypeScript)
- ✅ Architecture en place et fonctionnelle sur Android
- ✅ Thème dark crépusculaire (thème clair : toggle présent, sans effet pour l'instant)
- ✅ Secteurs hardcodés (8 sites, 72 sous-secteurs) + store favoris
- ✅ Carte OSM (MapLibre, sans clé API)
- ✅ Météo pondérée par sous-secteur via Open-Meteo (orientation + `rockType`, horizon 72h)
- ✅ Notifications locales (transition !good → good)
- ✅ Digest quotidien à heure configurable
- ✅ Fiabilité background : exemption batterie + alarmes exactes (module natif Android)
- ✅ Hibernation estivale configurable
- ⏳ Corriger les 14 orientations marquées « estimée » dans `src/data/sectors.ts`
- ⏳ Affinage / calibration des seuils météo
- ⏳ Finalisation iOS (scaffold présent, couche fiabilité Android-only)

## Décisions clés

- Secteurs saisis à la main dans le code — pas d'API Oblyk pour l'instant
- Hiérarchie : `Sector > SubSector` uniquement (pas de voies)
- Orientation appartient au sous-secteur (même falaise = même orientation)
- `rockType` (`fast`/`slow`) par sous-secteur → fenêtre de pluie récente (6h vs 24h)
- Grand site multi-expositions → deux `Sector` distincts
- Fenêtre d'analyse tranchée : **72h**, créneaux de jour 7h–20h
- Digest tiré à l'heure pile via AlarmManager exact (nécessite exemption batterie)
- Géolocalisation reportée (batterie + permissions)

## Questions en suspens

- Calibration des poids/seuils météo (`SCORE_WEIGHTS` dans `weatherLogic.ts`) — notamment `BASE = 6` vs `THRESHOLD_GOOD = 6.0` (modèle optimiste par construction)
- Fiabilité du tir background sur OEM agressifs (Samsung/Xiaomi) — non vérifiée sur device physique
- CI/CD GitHub Actions (lint + tests + build Android) — absente à ce jour
