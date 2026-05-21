# Almost Blue — CLAUDE.md

Application React Native qui alerte les grimpeurs outdoor quand une fenêtre météo favorable s'ouvre sur leurs secteurs d'escalade suivis, hors saison estivale.

## Équipe

- **Snoons** (Snowballe) — sysadmin, lead projet. Pas dev : adapter les explications en conséquence, aller droit au but.
- **Wawann** — développeur React Native (front).

## Stack

| Couche | Choix |
|---|---|
| Framework | React Native 0.82 + TypeScript |
| Cibles | Android (priorité) → iOS → Web |
| État | Zustand (décision prise, package installé) |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| HTTP | axios |
| Storage | AsyncStorage (simple) + SQLite (complexe, à ajouter) |
| Tests | Jest |
| Météo principale | Open-Meteo (gratuit, sans clé) |
| Météo secondaire | Meteoblue (optionnel, clé requise) |
| Secteurs | Oblyk API (`HttpApiAccessToken` header) |

## Variables d'environnement

Copier `.env.example` → `.env`. Ne jamais committer `.env`.

```env
OBLYK_API_BASE_URL=https://api.oblyk.org
OBLYK_API_TOKEN=...
OPEN_METEO_API_BASE_URL=https://api.open-meteo.com
METEOBLUE_API_BASE_URL=https://my.meteoblue.com
METEOBLUE_API_KEY=
NOTIFICATION_CHECK_INTERVAL_HOURS=4
DEFAULT_LOCALE=fr
ENABLE_GEOLOCATION_PROMPT=true
```

Note : le token Oblyk de prod est inaccessible (liens Oblyk hors service). Utiliser un token de dev en attendant.

## Commandes utiles

```bash
npm install
npx react-native start          # Metro bundler
npx react-native run-android    # Android
npx react-native run-ios        # iOS (macOS uniquement)
npm test                        # Jest
npm run lint                    # ESLint
cd android && ./gradlew assembleDebug   # APK debug
```

## Logique météo (résumé)

Détecter des créneaux « rocher grimpable » hors été :
- Analyser les prochaines 24–72h, vérification toutes les 4–6h.
- Si précipitations récentes → exiger vent minimal l'après-midi pour séchage.
- Prendre en compte : orientation falaise, température, ensoleillement, heure.
- Option « grimper de nuit » pour élargir les créneaux.
- Seuils exacts à calibrer (à ne pas hard-coder, prévoir config utilisateur).

## Notifications

- Locales (économie batterie, pas de serveur push).
- Importance normale, élevée si orage/tempête.
- Opt-in/out par secteur et par critère.

## Décisions en suspens

- Seuils météo exacts (vent, température, orientation, tolérance pluie).
- Fenêtre d'analyse exacte (24 / 48 / 72h).
- Structure des dossiers src (à faire lors de l'init réelle du projet).
- CI/CD GitHub Actions (lint + tests + build Android).
- SQLite : ajouter `react-native-sqlite-storage` quand nécessaire.

## Roadmap

- **v0** : recherche secteur par nom, favoris, notifications locales, logique météo minimale, Android.
- **v1** : personnalisation fine des seuils, meilleure logique assèchement, iOS.
- **v2** : Web (React Native Web), cartes, géoloc avancée, analytics opt-in.

## Conventions

- TypeScript strict, ESLint + Prettier.
- Pas de clés/secrets dans le code — variables d'environnement uniquement.
- Géolocalisation opt-in uniquement.
- Langue UI : français en priorité, i18n prévu dès v1.
