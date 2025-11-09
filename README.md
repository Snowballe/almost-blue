Almost blue
===========

Slogan: « presque bleu » – comme un ciel presque parfait pour aller grimper hors saison.

Présentation
------------
Almost blue est une application React Native qui alerte les grimpeurs outdoor lorsqu'une fenêtre météo favorable est détectée sur leurs secteurs d'escalade suivis, en dehors de la période estivale. Elle s'appuie sur les données ouvertes d'Oblyk (sites d'escalade) et les prévisions de Meteoblue (avec possibilité de croiser avec Météo-France si nécessaire).

Plateformes et langues
----------------------
- Plateformes ciblées: Android (prioritaire), iOS, puis Web.
- Langues: Français en priorité, multi-langue prévu.
- React Native avec TypeScript.

Fonctionnalités
---------------
- Recherche de secteurs (par nom) et ajout aux favoris.
- Mode hors-ligne pour consultation minimale des secteurs/favoris.
- Notifications locales sur fenêtres météo favorables:
  - Prise en compte des précipitations récentes, du vent (assèchement), de la température, de l’orientation de la falaise et des créneaux horaires.
  - Option « prêt à grimper de nuit » pour élargir les créneaux.
  - Personnalisation des seuils et critères par utilisateur (à affiner).
- Géolocalisation (opt-in): suggestion/filtrage par proximité si autorisée; sinon ajout manuel des secteurs.

Logique météo (résumé)
----------------------
Objectif: détecter des créneaux « rocher grimpable » hors été.
- Si précipitations récentes, exiger un vent minimal l’après-midi (intensité à calibrer).
- Prendre en compte température, orientation et ensoleillement pour le séchage et le confort.
- Fenêtre analysée sur les prochaines 24–72h (à préciser) avec vérification automatique toutes les 4–6h.

APIs et données
---------------
- Oblyk: utilisation des endpoints « sites » pour référencer les secteurs d’escalade.
- Meteoblue: APIs en mode gratuit pour les prévisions (possibilité de croiser avec Météo-France en cas de quota insuffisant).
- Gestion des quotas: stratégie à définir (backoff/retry, p.ex. jusqu’à 5 essais max).

Notifications
-------------
- Type: locales si possible (économie de batterie, connectivité minimale).
- Fréquence d’activation: toutes les 4–6h.
- Importance: normale, avec élévation en cas d’orage/tempête.
- Opt-in/out: l’utilisateur peut activer/désactiver par secteur et/ou par critère.

Architecture technique (React Native)
-------------------------------------
- Framework: React Native avec TypeScript.
- Couches/Modules: UI (composants React), domaine (règles météo), données (APIs Oblyk/Meteoblue, cache/offline).
- Gestion d'état: Context API, Redux Toolkit ou Zustand (à confirmer).
- Navigation: React Navigation.
- HTTP/Storage: axios ou fetch, AsyncStorage pour le cache local.

Configuration
-------------
Créer un fichier `.env` (ou variables d’environnement équivalentes) pour les clés API et réglages:

```env
# Clés et endpoints
OBLYK_API_BASE_URL=https://api.oblyk.org
METEOBLUE_API_BASE_URL=https://my.meteoblue.com
METEOBLUE_API_KEY=changeme

# Paramètres application
NOTIFICATION_CHECK_INTERVAL_HOURS=4
DEFAULT_LOCALE=fr
ENABLE_GEOLOCATION_PROMPT=true

# Optionnel: second fournisseur si quotas dépassés
METEOFRANCE_API_BASE_URL=https://api.meteo.fr
METEOFRANCE_API_KEY=
```

Installation et lancement (développement)
-----------------------------------------
Prérequis généraux:
- Node.js (LTS recommandé)
- Java/Android SDK pour Android
- Xcode pour iOS (macOS uniquement)
- React Native CLI: `npm install -g react-native-cli`

Commandes de base:
```bash
# Installer les dépendances
npm install
# ou
yarn install

# Lancer sur Android (émulateur ou device)
npx react-native run-android

# Lancer sur iOS (macOS uniquement)
npx react-native run-ios

# Démarrer le Metro bundler
npx react-native start
```

Build
-----
```bash
# APK de debug Android
cd android && ./gradlew assembleDebug

# APK de release Android
cd android && ./gradlew assembleRelease

# iOS (macOS uniquement)
cd ios && xcodebuild -workspace YourApp.xcworkspace -scheme YourApp -configuration Release
```

Offline et cache
----------------
- Stockage local: AsyncStorage pour données simples, SQLite (react-native-sqlite-storage) pour données complexes.
- Politique de rétention: à calibrer (p.ex. conserver les prévisions récentes et la liste des secteurs favoris).
- Pour le Web (React Native Web): fallback vers localStorage/indexedDB.

Tests
-----
```bash
# Tests unitaires
npm test
# ou
yarn test

# Tests avec coverage
npm test -- --coverage
```

Sécurité et vie privée
----------------------
- Permissions: géolocalisation (opt-in), notifications.
- Gestion des secrets: ne pas committer les clés; utiliser des variables d’environnement / coffre-fort.
- Politique de confidentialité: à lier ici lorsqu’elle sera disponible.

Contribuer
----------
Les contributions sont bienvenues!
- Ouvrir une issue pour discuter d'une idée/bug avant PR.
- Décrire clairement les critères météo/UX proposés.
- Respecter le style de code React/TypeScript (ESLint/Prettier) et ajouter des tests si possible.
- CI/CD: GitHub Actions (pipeline à définir pour lint/tests/build Android/iOS).

Crédits
-------
- Données des sites: Oblyk (APIs libres et gratuites).
- Prévisions météo: Meteoblue (mode gratuit) et possibilité de Météo-France en complément.

Roadmap (extrait)
------------------
- v0: Recherche par nom de secteur, favoris, notifications locales 4–6h, logique météo minimale, Android.
- v1: Personnalisation fine des seuils, meilleure logique d'assèchement (vent vs orientation), iOS.
- v2: Web (React Native Web), cartes, géolocalisation avancée, analytics opt-in, optimisations batterie.

Licence
-------
Licence MIT (ajouter le fichier `LICENSE`). Repo privé pour l'instant.

Contact / Support
-----------------
- Questions/retours: ouvrir une issue GitHub
- Références: Oblyk (`https://oblyk.org`), Meteoblue (`https://www.meteoblue.com`)

Captures d'écran
----------------
Ajoutez ici 2–3 captures clés (home, recherche, configuration notification) lorsque disponibles.

Informations à confirmer / TODO
-------------------------------
- Choix définitif de gestion d'état (Context API, Redux Toolkit ou Zustand).
- Fenêtre d'analyse météo exacte (24/48/72h) et seuils par défaut (vent après pluie, intensité, orientation, température, tolérance précipitations).
- Détails des endpoints Oblyk et produits Meteoblue utilisés.
- Politique de confidentialité (lien) et implémentation CI/CD GitHub Actions.

