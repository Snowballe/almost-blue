# Almost Blue — CLAUDE.md

Application Android native qui alerte les grimpeurs outdoor quand une fenêtre
météo favorable s'ouvre sur leurs secteurs d'escalade suivis, hors saison estivale.

## Stack

| Couche | Choix |
|---|---|
| Langage | Kotlin 2.1 (AGP 8.12, Gradle 8.13, minSdk 24 → target 36) |
| UI | Jetpack Compose + Material3 — tokens custom via `AppTheme.colors` |
| Navigation | navigation-compose (3 onglets + détail), gate hibernation dans `AppRoot` |
| Persistance | DataStore Preferences (3 stores : settings / sectors / notifications) |
| HTTP | OkHttp + kotlinx.serialization |
| Météo | Open-Meteo (gratuit, sans clé) — base URL en `BuildConfig` |
| Carte | MapLibre Android + plugin annotations, tuiles raster OSM (sans clé) |
| Tâches fond | WorkManager (check périodique) + AlarmManager exact (digest) + BootReceiver |
| Notifications | NotificationManager natif, canal `weather-alerts` HIGH |
| Tests | JUnit — domaine + data + notifications (166 tests) |
| Release | R8/minify + shrinkResources, ABI `arm64-v8a` seule (device perso) |

## Palette — dark crépusculaire (référence : Chet Baker, "Almost Blue")

Tokens dans `ui/theme/Color.kt` (`DarkColors`/`LightColors`) :
background `#0D0F14` · surface `#161B26` · surfaceHigh `#1E2535` · border `#2A3347`
· accent `#4D7EFF` · textPrimary `#E8EAF0` · textMuted `#7B85A0` · good `#5EEAD4`
· warning `#F59E0B` · danger `#EF4444`. Ne jamais hardcoder une couleur dans un
écran : toujours `AppTheme.colors`.

## Architecture

```
com.almostblue
├── AlmostBlueApp      — re-planification réactive (Flow settings → WorkManager/alarme + check 4s)
├── AppGraph           — DI minimaliste (singleton, pas de framework)
├── domain/            — logique pure, sans Android : WeatherLogic, SeasonLogic, OrientationUtils…
├── data/              — Sectors.kt (hardcodé), OpenMeteoClient (cache 1h + dédup), 3 repositories DataStore
├── notifications/     — WeatherNotifier (transitions, digest), messages FR, Reliability (Doze/alarmes/OEM)
├── background/        — CheckWorker, DigestReceiver, BootReceiver
└── ui/                — AppRoot (nav + gate), screens/, components/, theme/
```

**Secteurs hardcodés** dans `data/Sectors.kt` — pas d'API secteurs, pas d'UI d'ajout.

```kotlin
Sector(id, name, latitude, longitude, altitude?, notes?, subSectors)
SubSector(id, name, orientation, rockType /* FAST | SLOW */, notes?)
```

`rockType` est **requis** : `FAST` (granite/grès, sèche en quelques heures) vs
`SLOW` (calcaire/conglomérat, peut suinter 24h+). Il pilote la fenêtre de pluie
récente (6h vs 24h) et la sévérité du malus.

- Un sous-secteur hérite du GPS du secteur parent (un seul appel météo par secteur).
- L'orientation appartient au sous-secteur ; grand site multi-expositions → deux `Sector`.
- **Favoris** : seuls les IDs sont persistés (`SectorsRepository`, ordre préservé).

## Commandes

```bash
./gradlew test                 # 166 tests JUnit
./gradlew lint                 # Android lint
./gradlew installDebug         # APK debug
./build-release.sh             # APK release signé → dist/almost-blue-vX.Y.apk
```

## Logique météo

Fichier principal : `domain/WeatherLogic.kt` — hérité du port 1:1 de la v1.3,
a divergé depuis (bonus d'excellence) ; les tests font foi.

- 1 appel Open-Meteo par secteur ; cache mémoire 1h + dédup en vol (`OpenMeteoClient`).
- **Modèle additif pondéré** : chaque créneau part de `BASE` puis bonus/malus
  (précipitations, codes WMO, proba de pluie, température, vent, pluie récente ×
  exposition). Tous les poids dans `ScoreWeights` — recalibrer **là**, jamais inline.
- Score [0,10] → `WeatherScore` : ≥ 6.0 `GOOD`, ≥ 4.0 `OK`, sinon `BAD`.
- `getSubSectorSummary(forecast, orientation, rockType, horizonHours = 72)` →
  meilleur score (créneaux de jour 7h-20h) + première fenêtre `GOOD` contiguë.
- **Correctif d'orientation appliqué au *seuil* `MIN_TEMP`**, pas à la température
  lue : N +4°C, NE +3°C, NW +2°C, S -2°C, SW -2°C, SE -1°C, E/W ±0.
- **Exposition au vent** (`exposed`/`side`/`sheltered`) : face exposée + vent
  ≥ 15 km/h annule le malus de pluie récente (séchage actif).
- **Bonus « conditions excellentes »** (créneau *propre* : aucun malus déclenché,
  roche sèche) : sécheresse prolongée +2.0, température idéale friction +1.5
  (bande 5–18°C décalée par le correctif d'orientation). Plafond = 10.0 pile
  dès clair + sec + temp idéale — sans dépendre du vent séchant, qui sature via
  le clamp ; un créneau juste « sans problème » reste ~6.5.

## Notifications & background

- `CheckWorker` (WorkManager, intervalle des réglages, réseau requis) : gardes
  saison/été, transitions `!good → good` sur favoris, ré-arme le digest
  (auto-réparant).
- `DigestReceiver` + `setExactAndAllowWhileIdle` : digest quotidien à heure
  configurable, gardes anti-doublon (contenu + jour Paris), ré-armement après tir.
- `AlmostBlueApp` observe le Flow settings : tout changement d'intervalle/toggle/
  heure re-planifie, puis check différé de 4 s (verrou anti-concurrence).
- Fiabilité : exemption batterie + alarmes exactes (`notifications/Reliability.kt`),
  invite unique au premier lancement, section dédiée dans Réglages.

## Roadmap

- **v1.3 RN** *(remplacée)* : dernier état dans l'historique git (tag de la bascule).
- **v2.0 Kotlin** *(livré, 2026-07)* : parité stricte v1.3, APK 13,4 Mo (vs ~25 Mo RN).
- **À venir** : Oblyk API (recherche secteurs), personnalisation des seuils météo,
  géoloc « secteurs proches », analytics opt-in.
- **iOS : abandonné** *(2026-07)* — pas de Mac ni de compte Apple Developer.

## Conventions

- Kotlin idiomatique, pas de framework DI (AppGraph suffit).
- Pas de clés/secrets dans le code (`keystore.properties` gitignoré, NE PAS régénérer).
- Seuils et poids météo dans des constantes nommées (`ScoreWeights`), jamais inline.
- Langue UI : français. Textes de notification = messages exacts v1.3.
- Géolocalisation opt-in uniquement (v2+).
