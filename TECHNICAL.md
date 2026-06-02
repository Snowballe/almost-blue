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
│       └── IntervalSelector.tsx   Sélecteur de fréquence en chips
│
├── data/
│   └── sectors.ts                 Base de données hardcodée des secteurs (6 sites, ~50 sous-secteurs)
│
├── hooks/
│   └── useNotificationSetup.ts    Init notifications + background-fetch au démarrage
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
    ├── seasonLogic.ts             isOffSeason, nextSeasonChangeDate, maxDayForMonth
    └── weatherLogic.ts            buildForecast, getSubSectorSummary (algorithme de score)
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
weatherLogic.ts::getSubSectorSummary(forecast, orientation)
    Re-score chaque créneau avec le correctif d'orientation
    Retourne { score: 'good'|'ok'|'bad', nextGoodWindow }
    │
    ├──► SectorDetailScreen — badge par sous-secteur + prochain créneau
    ├──► MapScreen — couleur du pin (good=teal, ok=orange, bad=rouge)
    └──► notificationService — détection transition !good → good → notif
```

---

## Algorithme de score météo

Fichier : `src/utils/weatherLogic.ts`

Chaque créneau horaire reçoit un score `good / ok / bad` selon :

1. **Précipitations actives** > 0.5 mm/h → `bad` immédiat
2. **Codes WMO** (orages, neige, grosses pluies) → `bad` immédiat
3. **Probabilité de pluie** ≥ 80% → `bad` ; ≥ 60% → reason
4. **Température effective** < 5°C + correctif orientation → reason
5. **Pluie récente** (12h lookback) × exposition au vent → reason

`reasons.length === 0` → `good`, `=== 1` → `ok`, `≥ 2` → `bad`

**Correctif orientation (MIN_TEMP) :** N +4°C, NE +3°C, NW +2°C, E/W ±0, SE −1°C, S/SW −2°C

**Exposition vent :** `exposed` (±60°) / `side` (60–120°) / `sheltered` (>120°). Une face exposée + vent > 15 km/h annule le malus pluie récente (séchage actif).

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

Flux background (react-native-background-fetch) :

1. `index.js` enregistre la tâche headless `checkAndNotify`
2. `useNotificationSetup.ts` configure l'intervalle au démarrage (60 min par défaut)
3. `notificationService.ts::checkAndNotify()` :
   - Réhydrate les stores
   - Vérifie saison + paramètres
   - Pour chaque secteur favori : calcule les scores, compare aux `lastScores`
   - Envoie une notif si une orientation passe de !good → good
   - Persiste les nouveaux scores

---

## Tests

```
__tests__/
├── App.test.tsx                   Smoke test : rendu sans crash
├── stores/
│   └── useSectorsStore.test.ts    isFavorite, toggleFavorite (8 cas)
└── utils/
    ├── seasonLogic.test.ts        isOffSeason, nextSeasonChangeDate (15 cas)
    └── weatherLogic.test.ts       buildForecast, getSubSectorSummary (27 cas)
```

Commande : `npm test`

---

## Variables d'environnement

| Variable | Fichier `.env` | Usage |
|---|---|---|
| `OPEN_METEO_API_BASE_URL` | `https://api.open-meteo.com` | Base URL de l'API météo |

Copier `.env.example` → `.env`. Ne jamais committer `.env`.
