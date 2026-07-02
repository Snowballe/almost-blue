# Almost Blue — Documentation technique

## Stack

| Couche | Technologie | Version |
|---|---|---|
| Framework | React Native + TypeScript | 0.82 / strict |
| Cibles | Android (priorité) → iOS → Web | — |
| État | Zustand + persist (AsyncStorage) | ^5 |
| Navigation | React Navigation (native-stack + bottom-tabs) | — |
| HTTP | axios | ^1 |
| Carte | @maplibre/maplibre-react-native + tuiles OSM | ^11 |
| Notifications | @notifee/react-native | ^9 |
| Tâches fond | react-native-background-fetch | ^4 |
| Météo | Open-Meteo (gratuit, sans clé) | — |
| Tests | Jest + React Test Renderer | — |

---

## Arborescence `src/`

```
src/
├── components/
│   ├── ErrorBoundary.tsx          Boundary React pour les crashs non gérés
│   ├── FavoriteButton.tsx         Bouton ★/☆ réutilisable (thème interne)
│   ├── MonthDayPicker.tsx         Sélecteur jour/mois pour les bornes de saison
│   └── settings/
│       ├── SectionHeader.tsx      En-tête de section de l'écran Paramètres
│       ├── ToggleRow.tsx          Ligne toggle (Switch) avec label + description
│       ├── DateRow.tsx            Ligne date cliquable avec chevron
│       ├── IntervalSelector.tsx   Sélecteur de fréquence en chips
│       ├── HourSelector.tsx       Sélecteur d'heure du digest (0–23)
│       └── ReliabilitySection.tsx Section « Fiabilité » (exemption batterie / alarmes exactes)
│
├── data/
│   └── sectors.ts                 Base de données hardcodée des secteurs (8 sites, 72 sous-secteurs)
│
├── hooks/
│   ├── useNotificationSetup.ts    Init notifications + background-fetch + digest au démarrage
│   └── usePrefetchFavorites.ts    Préchauffe le cache météo des favoris à l'ouverture
│
├── navigation/
│   └── AppNavigator.tsx           Navigateur racine (Stack + Tabs + HibernationScreen conditionnel)
│
├── screens/
│   ├── HibernationScreen.tsx      Écran d'hibernation estivale (affiché si hors saison)
│   ├── MapScreen.tsx              Carte MapLibre avec pins colorés par score météo
│   ├── SectorDetailScreen.tsx     Détail d'un secteur — météo 48h par sous-secteur
│   ├── SectorListScreen.tsx       Liste des secteurs (favoris en haut)
│   └── SettingsScreen.tsx         Notifications, saison, apparence, debug
│
├── services/
│   ├── openMeteo.ts               Client Open-Meteo avec cache 1h + déduplication
│   └── notificationService.ts     Logique d'alerte météo (détection transition → notif)
│
├── stores/
│   ├── useSectorsStore.ts         Zustand — IDs des secteurs favoris (persisté)
│   ├── useSettingsStore.ts        Zustand — réglages app (notifications, saison, thème)
│   └── useNotificationStore.ts    Zustand — derniers scores connus (persisté, pour diff)
│
├── theme/
│   ├── colors.ts                  Palettes dark + light (tokens nommés)
│   ├── typography.ts              Échelle de tailles + graisses + interlignes
│   ├── spacing.ts                 Grille 4px (xs → xxxl)
│   ├── ThemeContext.tsx            ThemeProvider + useTheme() hook
│   └── index.ts                   Re-exports + HIT_SLOP + ACTIVE_OPACITY constants
│
├── types/
│   ├── sector.ts                  Orientation | SubSector | Sector
│   ├── weather.ts                 WeatherScore | WeatherSlot | WeatherForecast | SubSectorSummary
│   └── env.d.ts                   Déclaration @env (OPEN_METEO_API_BASE_URL)
│
└── utils/
    ├── orientationUtils.ts        ORIENTATION_LABEL (flèches) + ORIENTATION_FR (noms complets)
    ├── colorUtils.ts              Score → couleur de pin / badge
    ├── notificationReliability.ts Statut Doze / alarmes exactes / OEM + routage réglages
    ├── seasonLogic.ts             isOffSeason, nextSeasonChangeDate, maxDayForMonth
    └── weatherLogic.ts            buildForecast, getSubSectorSummary (score pondéré)
```

---

## Flux de données principal

```
Open-Meteo API
    │
    ▼
openMeteo.ts::getCachedForecast(lat, lon)
    Cache 1h en mémoire, déduplication des requêtes en vol
    │
    ▼
weatherLogic.ts::buildForecast(hourly)
    Transforme la réponse brute en WeatherForecast (slots horaires)
    │
    ▼
weatherLogic.ts::getSubSectorSummary(forecast, orientation, rockType, horizonHours=72)
    Re-score chaque créneau de jour (7h–20h) avec le correctif d'orientation
    et la fenêtre de pluie récente propre au rockType
    Retourne { score: 'good'|'ok'|'bad', numericScore, nextGoodWindow }
    │
    ├──► SectorDetailScreen — badge par sous-secteur + prochain créneau
    ├──► MapScreen — couleur du pin (good=teal, ok=orange, bad=rouge)
    └──► notificationService — détection transition !good → good → notif
```

---

## Algorithme de score météo

Fichier : `src/utils/weatherLogic.ts`

**Modèle additif pondéré.** Chaque créneau horaire part d'un score `BASE` (6) sur
une échelle [0, 10], puis accumule bonus/malus. Tous les coefficients sont
centralisés dans la constante `SCORE_WEIGHTS` — c'est le **seul** point de
recalibrage, jamais de valeur en dur dans la logique.

Facteurs appliqués :

1. **Précipitations actives** (> 0.5 mm/h) → malus proportionnel (`PRECIP_ACTIVE_PER_MM`).
   Sinon, un malus/bonus **WMO** mutuellement exclusif (orage / neige / pluie forte / ciel clair).
2. **Probabilité de pluie** ≥ 80% → malus fort ; ≥ 60% → malus modéré.
3. **Température effective** sous le seuil `MIN_TEMP` (+ correctif d'orientation) → malus par degré.
4. **Vent fort** (> 60 km/h) → malus (inconfort / sécurité).
5. **Pluie récente** × **exposition au vent** : cumul de pluie sur 6h (`fast`) ou 24h
   (`slow`) pondéré par l'exposition de la paroi. Vent de face fort → séchage actif → malus annulé.

Le score numérique est ensuite dérivé en `WeatherScore` :
`>= THRESHOLD_GOOD` (6.0) → `good`, `>= THRESHOLD_OK` (4.0) → `ok`, sinon `bad`.

`getSubSectorSummary` retient le **meilleur** score numérique sur l'horizon (72h par
défaut, créneaux de jour 7h–20h) et calcule la première fenêtre de `good` consécutifs.

**Correctif orientation (appliqué au *seuil* `MIN_TEMP`, pas à la température) :**
N +4°C, NE +3°C, NW +2°C, E/W ±0, SE −1°C, S/SW −2°C — une face N est donc plus exigeante.

**Exposition vent :** `exposed` (±60°) / `side` (60–120°) / `sheltered` (>120°). Une face
exposée + vent ≥ 15 km/h annule le malus de pluie récente (séchage actif).

> ⚠️ Calibration non validée terrain : `BASE = 6` == `THRESHOLD_GOOD = 6.0`, donc un
> créneau neutre bascule d'emblée en `good` (modèle optimiste par construction).

---

## Stores Zustand

| Store | Clé AsyncStorage | Contenu |
|---|---|---|
| `useSectorsStore` | `sectors-store` | `favoriteIds: string[]` |
| `useSettingsStore` | `settings-store` | notifications, intervalles, saison, thème |
| `useNotificationStore` | `notification-store` | `lastScores: Record<sectorId:orientation, score>` |

Les stores sont réhydratés explicitement dans `notificationService.ts` (contexte headless) via `persist.rehydrate()`.

---

## Navigation

```
Stack (RootStack)
  ├── Tabs (HibernationScreen si hors-saison et hibernation activée)
  │   ├── SectorList
  │   ├── Map
  │   └── Settings
  └── SectorDetail  (params: { sectorId: string })
```

---

## Notifications

Flux background (react-native-background-fetch), routé par `taskId` :

1. `index.js` enregistre la tâche headless (exécutée app fermée). Le `taskId`
   distingue le **digest** (`DIGEST_TASK_ID`) des **checks météo** classiques.
2. `useNotificationSetup.ts` (au démarrage) : crée le canal, demande la permission,
   configure l'intervalle (**180 min / 3h par défaut**), planifie le digest, et propose
   une fois l'invite de fiabilité (exemption batterie).
3. `notificationService.ts::checkAndNotify()` :
   - Réhydrate les stores (`Promise.allSettled`)
   - Vérifie saison + paramètres
   - Pour chaque secteur favori : calcule les scores par orientation, compare aux `lastScores`
   - Envoie une notif si une orientation passe de !good → good
   - Persiste les nouveaux scores

**Digest quotidien** (`sendDailyDigest` + `scheduleNextDigest`) : résumé des favoris
sur 7 jours, tiré à l'heure configurée (`digestHour`) via **AlarmManager exact**
(`forceAlarmManager`) pour partir à l'heure pile même en Doze. Anti-doublon par jour
calendaire (Europe/Paris) et par contenu identique. La planification est
auto-réparante : ré-armée à chaque check et au boot (`startOnBoot`).

**Fiabilité** (`utils/notificationReliability.ts` + module natif Kotlin
`BatteryOptimizationModule`) : lit l'état Doze / alarmes exactes / gestionnaire OEM et
route vers les écrans système. La popup d'exemption batterie est une vraie boîte de
dialogue système (intent `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).

---

## Tests

```
__tests__/
├── App.test.tsx                       Smoke test : rendu sans crash
├── __mocks__/                         Mocks natifs (maplibre, notifee, async-storage,
│                                      background-fetch, @env)
├── services/
│   ├── openMeteo.test.ts              Cache 1h + déduplication des requêtes
│   └── notificationService.test.ts    Digest, transitions, formatNextWindow
├── stores/
│   ├── useSectorsStore.test.ts        isFavorite, toggleFavorite
│   ├── useSettingsStore.test.ts       Réglages + reset
│   └── useNotificationStore.test.ts   lastScores, digest
└── utils/
    ├── colorUtils.test.ts
    ├── orientationUtils.test.ts
    ├── seasonLogic.test.ts            isOffSeason, nextSeasonChangeDate
    └── weatherLogic.test.ts           buildForecast, getSubSectorSummary
```

10 suites, **213 tests** au vert. Commande : `npm test`

---

## Variables d'environnement

| Variable | Fichier `.env` | Usage |
|---|---|---|
| `OPEN_METEO_API_BASE_URL` | `https://api.open-meteo.com` | Base URL de l'API météo |

Copier `.env.example` → `.env`. Ne jamais committer `.env`.
