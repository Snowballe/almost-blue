Almost Blue
===========

[![CI](https://github.com/Snowballe/almost-blue/actions/workflows/ci.yml/badge.svg)](https://github.com/Snowballe/almost-blue/actions/workflows/ci.yml)

« presque bleu » — comme un ciel presque parfait pour aller grimper hors saison.

Application Android **native (Kotlin + Jetpack Compose)** qui surveille la météo
sur des secteurs d'escalade hardcodés et envoie une notification locale quand une
fenêtre favorable s'ouvre, en dehors de la période estivale.

> v2.0 = réécriture native de l'app React Native v1.3, à parité stricte.
> APK ~13 Mo (vs ~25 Mo en RN), zéro dépendance JS.

---

## Démarrage rapide

```bash
./gradlew installDebug        # build + installation (device USB ou émulateur)
./gradlew test                # tests JUnit
./build-release.sh            # APK release signé → dist/
```

Prérequis : JDK 17, Android SDK. Pas de clé d'API : Open-Meteo et les tuiles OSM
sont gratuits et sans authentification.

---

## Fonctionnalités (v2.0)

- **Liste de secteurs** avec favoris persistés (DataStore)
- **Carte OSM** (MapLibre, sans clé) — pins colorés par score météo, panneau glissant
- **Détail secteur** — score météo 72h par sous-secteur (orientation + type de roche) + prochain créneau favorable
- **Notifications locales** — alerte dès qu'un favori passe de `bad/ok` → `good`
- **Digest quotidien** — résumé des favoris à heure configurable, tiré par alarme exacte (fiable même app fermée / Doze)
- **Fiabilité des notifications** — exemption d'optimisation batterie + alarmes exactes, section dédiée dans les réglages
- **Hibernation estivale** — l'app se met en veille d'avril à octobre (configurable), avec override
- **Écran Réglages** — fréquence de vérification, bornes de saison, heure du digest, thème dark/light

---

## Ajouter un secteur

Les secteurs sont saisis à la main dans `app/src/main/java/com/almostblue/data/Sectors.kt`.
Il n'y a pas d'API ni d'UI d'ajout.

```kotlin
Sector(
    id = "mon-secteur",
    name = "Mon Secteur",
    latitude = 44.123,
    longitude = 5.456,
    subSectors = listOf(
        SubSector("mon-secteur-dalle", "Dalle", Orientation.S, RockType.FAST),
        SubSector("mon-secteur-devers", "Dévers", Orientation.SW, RockType.SLOW),
    ),
),
```

Un `SubSector` hérite des coordonnées GPS du `Sector` parent (un seul appel météo
par secteur). L'orientation appartient au sous-secteur — même falaise, mêmes
coordonnées, expositions différentes. Le `rockType` (`FAST` = granite/grès, sèche
en quelques heures ; `SLOW` = calcaire/conglomérat, peut suinter 24h+) est requis
et pilote la fenêtre de pluie récente prise en compte. Pour un site avec des
parois très éloignées, créer deux `Sector` distincts.

---

## Architecture

```
app/src/main/java/com/almostblue/
├── domain/            Score météo pondéré + logique de saison (pur, sans Android)
├── data/              Sectors.kt (base de données), client Open-Meteo (cache 1h
│                      + déduplication), repositories DataStore
├── notifications/     Détection de transitions, digest, messages FR, fiabilité
├── background/        CheckWorker (WorkManager), DigestReceiver (alarme exacte), boot
└── ui/                Compose : navigation, 5 écrans, thème (tokens)
```

Voir [TECHNICAL.md](TECHNICAL.md) pour le détail du flux de données, de
l'algorithme météo et du câblage background.

---

## Commandes utiles

```bash
./gradlew test               # Tests JUnit
./gradlew lint               # Android lint
./gradlew installDebug       # Installe l'APK debug (.next, coexiste avec la release)
./gradlew assembleRelease    # APK release minifié (R8)
./build-release.sh           # Release signée → dist/almost-blue-vX.Y.apk
```

---

## Configuration

Pas de `.env` : la base URL Open-Meteo (non secrète) est un `buildConfigField`
dans `app/build.gradle.kts`. La signature release lit `keystore.properties`
(racine, gitignoré) et retombe sur le keystore debug s'il est absent (CI).

---

## Stack

| Couche | Choix |
|---|---|
| Langage | Kotlin 2.1 — minSdk 24, target 36 |
| UI | Jetpack Compose + Material3 (tokens custom) |
| Navigation | navigation-compose |
| Persistance | DataStore Preferences |
| HTTP | OkHttp + kotlinx.serialization |
| Carte | MapLibre Android + tuiles OSM (sans clé) |
| Météo | Open-Meteo (gratuit, sans clé) |
| Notifications | NotificationManager natif |
| Tâches fond | WorkManager + AlarmManager exact |
| Tests | JUnit |

---

## Roadmap

- **v0 → v1.3** *(React Native, remplacée)* : secteurs hardcodés, liste + carte +
  favoris, météo pondérée par sous-secteur, notifications, digest, fiabilité
  background, hibernation estivale.
- **v2.0** *(Kotlin natif, livré)* : parité stricte v1.3, APK divisé par ~2,
  suppression de la couche JS.
- **À venir** : intégration Oblyk (recherche de secteurs), personnalisation fine
  des seuils météo, géolocalisation opt-in (secteurs proches). iOS est abandonné
  (pas de Mac ni de compte Apple Developer).
