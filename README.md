Almost blue
===========

Slogan: « presque bleu » – comme un ciel presque parfait pour aller grimper hors saison.

Présentation
------------
Almost blue est une application Flutter qui alerte les grimpeurs outdoor lorsqu’une fenêtre météo favorable est détectée sur leurs secteurs d’escalade suivis, en dehors de la période estivale. Elle s’appuie sur les données ouvertes d’Oblyk (sites d’escalade) et les prévisions de Meteoblue (avec possibilité de croiser avec Météo-France si nécessaire).

Plateformes et langues
----------------------
- Plateformes ciblées: Android et Web (prioritaires), iOS envisagé par la suite.
- Langues: Français en priorité, multi-langue prévu.
- Flutter/Dart: canal stable.

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

Architecture technique (Flutter)
--------------------------------
- Framework: Flutter (Dart) canal stable.
- Couches/Modules: UI, domaine (règles météo), données (APIs Oblyk/Meteoblue, cache/offline).
- Gestion d’état/navigation: viser des solutions simples (ex: `setState`, `Provider`/`Riverpod` léger) – choix définitif à confirmer.
- DI/HTTP, sérialisation: à préciser selon les choix du projet (dio/http, JsonSerializable/Freezed, etc.).

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
- Flutter SDK installé (version stable récente)
- Java/Android SDK pour Android, Chrome pour Web

Commandes de base:
```bash
flutter --version
flutter pub get

# Lancer sur Android (émulateur ou device)
flutter run -d android

# Lancer sur Web (Chrome)
flutter run -d chrome
```

Build
-----
```bash
# APK de debug
flutter build apk --debug

# APK de release
flutter build apk --release

# Web (release)
flutter build web
```

Offline et cache
----------------
- Stockage local envisagé: SQLite (pragmatique pour Android/Web via plugins adaptés).
- Politique de rétention: à calibrer (p.ex. conserver les prévisions récentes et la liste des secteurs favoris).
- TODO: valider l’implémentation offline côté Web (fallback éventuel en cache mémoire/indexedDB).

Tests
-----
```bash
flutter test
```

Sécurité et vie privée
----------------------
- Permissions: géolocalisation (opt-in), notifications.
- Gestion des secrets: ne pas committer les clés; utiliser des variables d’environnement / coffre-fort.
- Politique de confidentialité: à lier ici lorsqu’elle sera disponible.

Contribuer
----------
Les contributions sont bienvenues!
- Ouvrir une issue pour discuter d’une idée/bug avant PR.
- Décrire clairement les critères météo/UX proposés.
- Respecter le style de code Flutter/Dart et ajouter des tests si possible.
- CI/CD: GitHub Actions (pipeline à définir pour lint/tests/build Android/Web).

Crédits
-------
- Données des sites: Oblyk (APIs libres et gratuites).
- Prévisions météo: Meteoblue (mode gratuit) et possibilité de Météo-France en complément.

Roadmap (extrait)
------------------
- v0: Recherche par nom de secteur, favoris, notifications locales 4–6h, logique météo minimale, Android/Web.
- v1: Personnalisation fine des seuils, meilleure logique d’assèchement (vent vs orientation), iOS.
- v2: Cartes, géolocalisation avancée, analytics opt-in, optimisations batterie.

Licence
-------
Licence MIT (ajouter le fichier `LICENSE`). Repo privé pour l’instant.

Contact / Support
-----------------
- Questions/retours: ouvrir une issue GitHub
- Références: Oblyk (`https://oblyk.org`), Meteoblue (`https://www.meteoblue.com`)

Captures d’écran
----------------
Ajoutez ici 2–3 captures clés (home, recherche, configuration notification) lorsque disponibles.

Informations à confirmer / TODO
-------------------------------
- Choix définitif de gestion d’état/navigation (solution simple type `Provider` ou équivalent).
- Fenêtre d’analyse météo exacte (24/48/72h) et seuils par défaut (vent après pluie, intensité, orientation, température, tolérance précipitations).
- Détails des endpoints Oblyk et produits Meteoblue utilisés.
- Politique de confidentialité (lien) et implémentation CI/CD GitHub Actions.

