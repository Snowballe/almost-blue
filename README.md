Almost Blue
===========

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

## Fonctionnalités actuelles (v0)

- **Liste de secteurs** avec favoris persistés (Zustand + AsyncStorage)
- **Carte OSM** (MapLibre, sans clé) — pins colorés par score météo
- **Détail secteur** — score météo 48h par sous-secteur + prochain créneau favorable
- **Notifications locales** — alerte dès qu'un favori passe de `bad/ok` → `good`
- **Hibernation estivale** — l'app se met en veille d'avril à octobre (configurable)
- **Écran Réglages** — fréquence de vérification, bornes de saison, thème dark/light

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
    {id: 'mon-secteur-dalle', name: 'Dalle', orientation: 'S'},
    {id: 'mon-secteur-devers', name: 'Dévers', orientation: 'SW'},
  ],
},
```

Un `SubSector` hérite des coordonnées GPS du `Sector` parent (un seul appel météo par secteur). L'orientation appartient au sous-secteur — même falaise, mêmes coordonnées, expositions différentes. Pour un site avec des parois très éloignées, créer deux `Sector` distincts.

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
│   ├── weatherLogic.ts        Algorithme de score good/ok/bad
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

- **v0** *(actuel)* : secteurs hardcodés, liste + carte + favoris, météo par sous-secteur, notifications locales, Android.
- **v1** : intégration Oblyk (recherche de secteurs), personnalisation seuils météo, iOS.
- **v2** : géolocalisation opt-in (secteurs proches), analytics opt-in.
