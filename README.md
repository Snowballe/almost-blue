Almost Blue
===========

[![CI](https://github.com/Snowballe/almost-blue/actions/workflows/ci.yml/badge.svg)](https://github.com/Snowballe/almost-blue/actions/workflows/ci.yml)

« presque bleu » — comme un ciel presque parfait pour aller grimper hors saison.

Application Android (React Native) qui surveille la météo sur des secteurs d'escalade hardcodés et envoie une notification locale quand une fenêtre favorable s'ouvre, en dehors de la période estivale.

---

## Démarrage rapide

```bash
npm install
cp .env.example .env          # une seule variable à remplir
npm run android               # émulateur ou device USB
```

Prérequis : Node ≥ 20, Java / Android SDK, émulateur ou device en mode débogage.

---

## Fonctionnalités actuelles (v1.3)

- **Liste de secteurs** avec favoris persistés (Zustand + AsyncStorage)
- **Carte OSM** (MapLibre, sans clé) — pins colorés par score météo
- **Détail secteur** — score météo 72h par sous-secteur (orientation + type de roche) + prochain créneau favorable
- **Notifications locales** — alerte dès qu'un favori passe de `bad/ok` → `good`
- **Digest quotidien** — résumé des favoris envoyé à une heure configurable
- **Fiabilité des notifications** — exemption d'optimisation batterie + alarmes exactes pour un tir à l'heure pile même app fermée (module natif Android)
- **Hibernation estivale** — l'app se met en veille d'avril à octobre (configurable)
- **Écran Réglages** — fréquence de vérification, bornes de saison, heure du digest, thème dark/light

---

## Ajouter un secteur

Les secteurs sont saisis à la main dans `src/data/sectors.ts`. Il n'y a pas d'API ni d'UI d'ajout.

```typescript
{
  id: 'mon-secteur',
  name: 'Mon Secteur',
  latitude: 44.123,
  longitude: 5.456,
  subSectors: [
    {id: 'mon-secteur-dalle', name: 'Dalle', orientation: 'S', rockType: 'fast'},
    {id: 'mon-secteur-devers', name: 'Dévers', orientation: 'SW', rockType: 'slow'},
  ],
},
```

Un `SubSector` hérite des coordonnées GPS du `Sector` parent (un seul appel météo par secteur). L'orientation appartient au sous-secteur — même falaise, mêmes coordonnées, expositions différentes. Le `rockType` (`fast` = granite/grès, sèche en quelques heures ; `slow` = calcaire/conglomérat, peut suinter 24h+) est requis et pilote la fenêtre de pluie récente prise en compte. Pour un site avec des parois très éloignées, créer deux `Sector` distincts.

---

## Architecture

```
src/
├── data/sectors.ts            Secteurs hardcodés (base de données)
├── services/
│   ├── openMeteo.ts           Client Open-Meteo — cache 1h + déduplication
│   └── notificationService.ts Détection transition → alerte locale
├── stores/                    Zustand (favoris, réglages, scores connus)
├── utils/
│   ├── weatherLogic.ts        Score météo pondéré (orientation + roche) → good/ok/bad
│   └── seasonLogic.ts         Logique hors-saison / hibernation
├── screens/                   5 écrans (List, Map, Detail, Settings, Hibernation)
└── theme/                     Tokens couleur, typographie, espacement
```

Voir [TECHNICAL.md](TECHNICAL.md) pour le détail du flux de données, de l'algorithme météo et de la structure des stores.

---

## Commandes utiles

```bash
npm run android          # Lance sur Android
npm run start            # Metro bundler seul
npm test                 # Tests Jest
npm run lint             # ESLint
npm run lint:fix         # ESLint avec auto-fix
npm run type-check       # Vérification TypeScript (sans build)

cd android && ./gradlew assembleDebug    # APK debug
cd android && ./gradlew assembleRelease  # APK release
```

---

## Variables d'environnement

Copier `.env.example` → `.env`. Ne jamais committer `.env`.

| Variable | Valeur par défaut | Usage |
|---|---|---|
| `OPEN_METEO_API_BASE_URL` | `https://api.open-meteo.com` | Base URL API météo (gratuit, sans clé) |

---

## Stack

| Couche | Choix |
|---|---|
| Framework | React Native 0.82 + TypeScript strict |
| Cible principale | Android |
| État | Zustand + persist (AsyncStorage) |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Carte | MapLibre + tuiles OSM (sans clé) |
| Météo | Open-Meteo (gratuit, sans clé) |
| Notifications | @notifee/react-native |
| Tâches fond | react-native-background-fetch |
| Tests | Jest + React Test Renderer |

---

## Roadmap

- **v0 → v1.3** *(livré)* : secteurs hardcodés, liste + carte + favoris, météo pondérée par sous-secteur (orientation + roche), notifications locales, digest quotidien à heure configurable, fiabilité background (exemption batterie + alarmes exactes), hibernation estivale. Android.
- **À venir** : intégration Oblyk (recherche de secteurs), personnalisation fine des seuils météo, finalisation iOS, géolocalisation opt-in (secteurs proches).
