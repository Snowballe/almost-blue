# Almost Blue — Documentation technique

## Stack

| Couche | Technologie | Version |
|---|---|---|
| Langage | Kotlin (AGP 8.12, Gradle 8.13) | 2.1 |
| Cible | Android — minSdk 24, targetSdk 36 (iOS abandonné) | — |
| UI | Jetpack Compose + Material3, tokens custom | BOM 2024.12 |
| Navigation | androidx.navigation:navigation-compose | 2.8 |
| Persistance | DataStore Preferences | 1.1 |
| HTTP | OkHttp + kotlinx.serialization | 4.12 / 1.7 |
| Carte | MapLibre Android + plugin annotations, tuiles OSM | 11.11 / 3.0 |
| Notifications | NotificationManager natif (canal `weather-alerts`, HIGH) | — |
| Tâches fond | WorkManager + AlarmManager exact + BootReceiver | 2.10 |
| Météo | Open-Meteo (gratuit, sans clé) | — |
| Tests | JUnit + kotlinx-coroutines-test | 4.13 |

`java.time` sur minSdk 24 via core library desugaring.

---

## Arborescence `app/src/main/java/com/almostblue/`

```
├── AlmostBlueApp.kt          Application : canal notif + re-planification réactive
├── AppGraph.kt               DI minimaliste (singleton) + pose de l'alarme exacte
├── MainActivity.kt           Permission POST_NOTIFICATIONS + setContent { AppRoot() }
│
├── domain/                   Logique pure, sans dépendance Android
│   ├── WeatherLogic.kt       ScoreWeights, scoreSlotNumeric, buildForecast,
│   │                         getSubSectorSummary (score pondéré, fenêtres good)
│   ├── SeasonLogic.kt        isOffSeason, nextSeasonChangeDate, maxDayForMonth
│   ├── OrientationUtils.kt   label (flèches) + frenchName par orientation
│   ├── ColorUtils.kt         scoreGradientRgb (score → triplet rouge→jaune→vert)
│   ├── WeatherTypes.kt       WeatherScore | WeatherSlot | WeatherForecast | SubSectorSummary
│   └── Time.kt               Zone Paris + conversions
│
├── data/
│   ├── Sector.kt             Orientation | RockType | SubSector | Sector
│   ├── Sectors.kt            Base hardcodée : 8 sites, 72 sous-secteurs
│   ├── OpenMeteoClient.kt    Client Open-Meteo — cache 1h + déduplication en vol
│   ├── OpenMeteoHourly.kt    Modèles kotlinx.serialization de la réponse
│   ├── SettingsRepository.kt Réglages (11 champs, mêmes défauts que la v1.3)
│   ├── SectorsRepository.kt  IDs favoris (ordre préservé)
│   └── NotificationRepository.kt  lastScores + dédup digest (JSON)
│
├── notifications/
│   ├── WeatherNotifier.kt    checkAndNotify (transitions !good→good) + sendDailyDigest
│   ├── NotificationMessages.kt  Messages FR exacts v1.3 (corps, fenêtres, digest)
│   ├── AndroidNotifier.kt    Frontière NotificationManager (fake-able en test)
│   ├── DigestScheduler.kt    Calcul du délai jusqu'au prochain digest
│   └── Reliability.kt        Doze / alarmes exactes / gestionnaire OEM + intents système
│
├── background/
│   ├── CheckWorker.kt        Check périodique WorkManager (réseau requis, backoff)
│   ├── DigestReceiver.kt     Tir du digest (alarme exacte) + ré-armement
│   └── BootReceiver.kt       Re-planification au boot
│
└── ui/
    ├── AppRoot.kt            Thème piloté par les réglages, gate hibernation,
    │                         tabs Secteurs/Carte/Réglages + détail, invite fiabilité
    ├── screens/              SectorList, SectorDetail, Map, Settings, Hibernation
    ├── components/           FavoriteButton, MonthDayPicker, settings/ (6 composants)
    └── theme/                Color (tokens dark+light), Dimens, Theme, ScoreColors
```

---

## Flux de données principal

```
Open-Meteo API
    │
    ▼
OpenMeteoClient.getCachedForecast(lat, lon)
    Cache 1h en mémoire, déduplication des requêtes en vol (attente hors mutex)
    │
    ▼
WeatherLogic.buildForecast(hourly)
    Transforme la réponse brute en WeatherForecast (slots horaires)
    │
    ▼
WeatherLogic.getSubSectorSummary(forecast, orientation, rockType, horizonHours=72)
    Re-score chaque créneau de jour (7h–20h) avec le correctif d'orientation
    et la fenêtre de pluie récente propre au rockType
    Retourne SubSectorSummary(score GOOD|OK|BAD, numericScore, nextGoodWindow)
    │
    ├──► SectorDetailScreen — badge par sous-secteur + prochain créneau
    ├──► MapScreen — couleur du pin (gradient sur le meilleur score)
    └──► WeatherNotifier — détection transition !good → good → notif
```

---

## Algorithme de score météo

Fichier : `domain/WeatherLogic.kt` — port 1:1 de la v1.3, verrouillé par les tests.

**Modèle additif pondéré.** Chaque créneau horaire part d'un score `BASE` (6) sur
une échelle [0, 10], puis accumule bonus/malus. Tous les coefficients sont
centralisés dans `ScoreWeights` — c'est le **seul** point de recalibrage, jamais
de valeur en dur dans la logique.

Facteurs appliqués :

1. **Précipitations actives** (> 0.5 mm/h) → malus proportionnel. Sinon, un
   malus/bonus **WMO** mutuellement exclusif (orage / neige / pluie forte / ciel clair).
2. **Probabilité de pluie** ≥ 70% → malus fort ; ≥ 40% → malus modéré.
3. **Température effective** sous le seuil `MIN_TEMP` (= 2°C, + correctif
   d'orientation) → malus par degré, **faible** (0.5/°C) : le froid sec ne gêne
   pas la grimpe (bonne friction).
4. **Vent fort** (> 60 km/h) → malus (inconfort / sécurité).
5. **Pluie récente** × **exposition au vent** : cumul sur 6h (`FAST`) ou 24h
   (`SLOW`), sévérité selon la roche (granite doux, calcaire sévère). Vent de
   face fort → séchage actif → malus annulé.

Score numérique → `WeatherScore` : ≥ 6.0 `GOOD`, ≥ 4.0 `OK`, sinon `BAD`.

**Correctif orientation (appliqué au *seuil* `MIN_TEMP`, pas à la température) :**
N +4°C, NE +3°C, NW +2°C, E/W ±0, SE −1°C, S/SW −2°C.

**Exposition vent :** `exposed` (±60°) / `side` (60–120°) / `sheltered` (>120°).
Face exposée + vent ≥ 15 km/h annule le malus de pluie récente.

> Choix de calibration assumé : `BASE = 6` == `THRESHOLD_GOOD = 6.0` — un créneau
> neutre (sec, couvert) est `GOOD` d'emblée, la dégradation vient des malus.

---

## Persistance (DataStore)

| Repository | Fichier | Contenu |
|---|---|---|
| `SettingsRepository` | `settings.preferences_pb` | notifications, intervalle, saison, thème, digest, override |
| `SectorsRepository` | `sectors.preferences_pb` | `favoriteIds` (string jointe, ordre préservé) |
| `NotificationRepository` | `notifications.preferences_pb` | `lastScores` (JSON), dédup digest (contenu + date) |

Mêmes champs et défauts que les stores Zustand v1.3. Pas de rehydration manuelle :
les Flows DataStore sont lisibles depuis n'importe quel contexte (worker, receiver).

---

## Navigation

```
AppRoot (gate : HibernationScreen si hors-saison estivale et hibernation activée)
  └── NavHost
      ├── sectors    SectorListScreen (onglet)
      ├── map        MapScreen (onglet)
      ├── settings   SettingsScreen (onglet)
      └── sector/{sectorId}   SectorDetailScreen (top bar : retour + favori)
```

---

## Notifications & background

1. **`AlmostBlueApp`** observe le Flow settings (`distinctUntilChanged` sur
   intervalle / toggles / heure du digest) : chaque changement — et la première
   émission au démarrage — re-planifie le `CheckWorker` et l'alarme du digest,
   puis lance un check différé de 4 s (verrou anti-concurrence, non annulable
   une fois parti). Équivalent exact du `useNotificationSetup` v1.3.
2. **`CheckWorker`** (WorkManager, périodique, réseau requis) : gardes saison/été,
   compare les scores aux `lastScores`, notifie les transitions `!good → good`
   par secteur favori, persiste, et **ré-arme le digest** (auto-réparation si
   l'alarme a été perdue).
3. **`DigestReceiver`** : tiré par `setExactAndAllowWhileIdle` à l'heure configurée
   (défaut 10h00) — part à l'heure pile même en Doze. Anti-doublon par jour
   calendaire (Europe/Paris) et par contenu identique. Ré-arme le lendemain.
4. **`BootReceiver`** : re-planifie la chaîne au redémarrage du device.
5. **Fiabilité** (`Reliability.kt`) : statut exemption batterie / alarmes exactes /
   gestionnaire OEM (liste notifee portée, sans `<queries>` — inopérante sur
   Android 11+, comme en v1.3). Invite système unique au premier lancement,
   section « Fiabilité » dans les réglages avec routage vers les écrans système.

Validation grandeur nature (2026-07-04, Samsung A52 / Android 14) : digest tiré
à 21:00:00 pile app en arrière-plan, textes FR conformes, ré-armement vérifié.

---

## Tests

```
app/src/test/java/com/almostblue/
├── domain/          weatherLogic (48), seasonLogic (24), colorUtils (7), orientationUtils (3)
├── data/            OpenMeteoClient (cache/dédup, 8), repositories (16), Sectors (unicité)
└── notifications/   messages FR, transitions, digest, scheduler (41)
```

**151 tests** au vert, re-dérivés des 217 tests Jest v1.3 (les tests de rendu RN
n'ont pas d'équivalent). Commande : `./gradlew test`

---

## Configuration

Pas de `.env` : `OPEN_METEO_BASE_URL` est un `buildConfigField` (non secret) dans
`app/build.gradle.kts`.

---

## Intégration continue (CI)

GitHub Actions — `.github/workflows/ci.yml` : `./gradlew test lint assembleDebug`.
Aucun secret requis : la CI ne fait pas de build release signé (fallback keystore debug).

---

## Signature & build release

Le build **release** est signé avec un keystore dédié, conservé **hors dépôt** :

| Fichier | Rôle | Suivi par git ? |
|---|---|---|
| `app/almost-blue-release.keystore` | Clé de signature (ECDSA secp256r1) | ❌ ignoré |
| `keystore.properties` (racine) | Chemin du keystore + mots de passe | ❌ ignoré |
| `app/debug.keystore` | Clé debug publique (partagée) | ✅ versionné |

`app/build.gradle.kts` lit `keystore.properties` s'il existe, sinon retombe sur le
keystore debug (dev/CI uniquement). **Même keystore que la v1.3 RN** → la v2.0
s'installe en mise à jour par-dessus.

Release : R8/minify + shrinkResources, ABI `arm64-v8a` uniquement (device perso —
élargir `ndk.abiFilters` au besoin).

**Construire un APK signé (distribution) :**

```bash
./build-release.sh
# → dist/almost-blue-v<versionName>.apk   (dist/ est gitignoré)
```

> ⚠️ **SAUVEGARDE CRITIQUE.** Le keystore et son mot de passe ne sont **que** sur la
> machine de dev (gitignorés). Sauvegarde-les (password manager + copie hors ligne).
> Toute mise à jour doit être signée avec le même keystore — le perdre = réinstaller
> l'app de zéro sur chaque device.
