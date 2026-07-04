# Contexte du projet Almost Blue

## Concept

Application Android native (Kotlin + Compose) qui alerte les grimpeurs outdoor
quand une fenêtre météo favorable s'ouvre sur leurs secteurs d'escalade suivis,
hors saison estivale.

## État d'avancement (v2.0 — Kotlin)

- ✅ Réécriture native complète de la v1.3 RN, à parité stricte (2026-07)
- ✅ Secteurs hardcodés (8 sites, 72 sous-secteurs) + favoris DataStore
- ✅ Météo pondérée par sous-secteur via Open-Meteo (orientation + `rockType`, 72h)
- ✅ Notifications locales (transition !good → good) — validées grandeur nature sur device
- ✅ Digest quotidien à heure configurable, alarme exacte (validé app fermée, tir à la seconde)
- ✅ Carte OSM MapLibre + panneau glissant
- ✅ Fiabilité background : exemption batterie + alarmes exactes + hibernation estivale
- ✅ Thème sombre/clair effectif
- ✅ Release R8 signée : 13,4 Mo (vs ~25 Mo RN)
- ⏳ Checklist de parité device avant merge → main (voir PLAN-KOTLIN.md § M6)
- ⏳ Corriger les orientations marquées « estimée » dans `data/Sectors.kt`
- ⏳ Affinage / calibration des seuils météo
- ❌ iOS abandonné (pas de Mac ni compte Apple Developer)

## Décisions clés

- Secteurs saisis à la main dans le code — pas d'API Oblyk pour l'instant
- Passage RN → Kotlin natif (2026-07) : iOS abandonné, RN n'apportait plus que du poids
- Hiérarchie : `Sector > SubSector` uniquement (pas de voies)
- Orientation appartient au sous-secteur (même falaise = même orientation)
- `rockType` (`FAST`/`SLOW`) par sous-secteur → fenêtre de pluie récente (6h vs 24h)
- Grand site multi-expositions → deux `Sector` distincts
- Fenêtre d'analyse tranchée : **72h**, créneaux de jour 7h–20h
- Digest tiré à l'heure pile via AlarmManager exact (nécessite exemption batterie)
- Pas de framework DI : `AppGraph` singleton suffit à cette taille
- Release : ABI `arm64-v8a` seule (device perso) — élargir au besoin
- Géolocalisation reportée (batterie + permissions)

## Questions en suspens

- Calibration des poids/seuils météo (`ScoreWeights` dans `domain/WeatherLogic.kt`)
  — notamment `BASE = 6` vs `THRESHOLD_GOOD = 6.0` (modèle optimiste par construction)
- IDs de notification : `nextAlertId` repart à 100 à chaque process (une alerte
  peut en remplacer une autre après redémarrage) — hérité de la bascule, sans gravité
