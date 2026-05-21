# Contexte du projet Almost Blue

## Concept

Application React Native qui alerte les grimpeurs outdoor quand une fenêtre météo favorable s'ouvre sur leurs secteurs d'escalade suivis, hors saison estivale.

## État d'avancement

- ✅ Projet initialisé (RN 0.82 + TypeScript)
- ✅ Architecture v0 en place et fonctionnelle sur Android
- ✅ Thème dark crépusculaire
- ✅ Secteurs hardcodés + store favoris
- ✅ Carte OSM (MapLibre, sans clé API)
- ✅ Météo par sous-secteur via Open-Meteo
- ⏳ Saisie des vrais secteurs dans `src/data/sectors.ts`
- ⏳ Affinage seuils météo
- ⏳ Notifications locales

## Décisions clés

- Secteurs saisis à la main dans le code — pas d'API Oblyk pour v0
- Hiérarchie : `Sector > SubSector` uniquement (pas de voies)
- Orientation appartient au sous-secteur (même falaise = même orientation)
- Grand site multi-expositions → deux `Sector` distincts
- Géolocalisation reportée en v2 (batterie + permissions)

## Questions en suspens

- Seuils météo exacts (vent, température, tolérance pluie)
- Fenêtre d'analyse exacte (24 / 48 / 72h)
- CI/CD GitHub Actions (lint + tests + build Android)
