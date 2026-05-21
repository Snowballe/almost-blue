# Almost Blue — CLAUDE.md

Application React Native qui alerte les grimpeurs outdoor quand une fenêtre météo favorable s'ouvre sur leurs secteurs d'escalade suivis, hors saison estivale.

## Stack

| Couche | Choix |
|---|---|
| Framework | React Native 0.82 + TypeScript |
| Cibles | Android (priorité) → iOS → Web |
| État | Zustand (persist AsyncStorage) |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| HTTP | axios |
| Carte | @maplibre/maplibre-react-native + tuiles OSM (sans clé) |
| Panneau carte | Animated RN custom (pas de lib externe) |
| Animations | react-native-reanimated (dep transitive) |
| Gestes | react-native-gesture-handler (dep transitive) |
| Météo | Open-Meteo (gratuit, sans clé) |

## Palette — dark crépusculaire (référence : Chet Baker, "Almost Blue")

| Token | Hex | Usage |
|---|---|---|
| background | `#0D0F14` | fond principal |
| surface | `#161B26` | cartes, listes |
| surfaceHigh | `#1E2535` | éléments surélevés |
| border | `#2A3347` | séparateurs |
| accent | `#4D7EFF` | actions, pins carte |
| textPrimary | `#E8EAF0` | texte principal |
| textMuted | `#7B85A0` | texte secondaire |
| good | `#5EEAD4` | rocher sec |
| warning | `#F59E0B` | incertain |
| danger | `#EF4444` | humide / tempête |

## Architecture données

**Secteurs hardcodés** dans `src/data/sectors.ts` — pas d'API secteurs, pas d'UI d'ajout.  
Les topos sont saisis à la main directement dans le code.

```typescript
Sector { id, name, latitude, longitude, altitude?, notes?, subSectors[] }
SubSector { id, name, orientation, notes? }
```

- Un sous-secteur hérite du GPS du secteur parent (un seul appel météo par secteur).
- L'orientation appartient au sous-secteur (même falaise = même orientation).
- Pour un grand site avec expositions multiples → créer deux `Sector` distincts.

**Favoris** : seuls les IDs sont persistés (`src/stores/useSectorsStore.ts`).

## Variables d'environnement

Copier `.env.example` → `.env`. Ne jamais committer `.env`.

```env
OPEN_METEO_API_BASE_URL=https://api.open-meteo.com
```

## Commandes utiles

```bash
npm install
npx react-native start --reset-cache   # Metro bundler
npx react-native run-android           # Android
npm test                               # Jest
npm run lint                           # ESLint
cd android && ./gradlew assembleDebug  # APK debug
```

## Logique météo

Fichier principal : `src/utils/weatherLogic.ts`

- 1 appel Open-Meteo par secteur (lat/lng partagé entre sous-secteurs)
- Cache en mémoire 1h (`src/services/openMeteo.ts` → `getCachedForecast`)
- Score par créneau : `good` / `ok` / `bad`
- `getSubSectorSummary(forecast, orientation)` → meilleur score sur 48h en tenant compte de l'orientation

**Modificateur de température par orientation :**
- N +4°C, NE +3°C, NW +2°C (plus froid, sèche lentement)
- S -2°C, SW -2°C, SE -1°C (plus ensoleillé, sèche vite)
- E/W ±0°C

## Navigation

```
RootStack
  ├── Tabs
  │   ├── SectorList (onglet 1)
  │   └── Map (onglet 2) — MapLibre OSM + panneau glissant Animated
  └── SectorDetail (stack, accessible depuis les deux onglets)
```

## Roadmap

- **v0** : secteurs hardcodés, liste + carte (favoris), météo par sous-secteur, Android.
- **v1** : Oblyk API (recherche secteurs), personnalisation seuils météo, iOS.
- **v2** : géoloc "secteurs proches", notifications locales, analytics opt-in.

## Conventions

- TypeScript strict, ESLint + Prettier.
- Pas de clés/secrets dans le code — variables d'environnement uniquement.
- Géolocalisation opt-in uniquement (v2).
- Langue UI : français en priorité.
- Seuils météo dans des constantes nommées dans `weatherLogic.ts`, jamais hardcodés inline.
