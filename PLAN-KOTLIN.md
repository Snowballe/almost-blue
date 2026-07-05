# Réécriture Kotlin — plan de travail et état d'avancement

> **Document de reprise inter-sessions.** Toute session (humaine ou Claude) qui
> reprend ce chantier commence ici : lire « État courant », exécuter
> « Prochaine action ». Mettre à jour ce fichier et committer après CHAQUE
> étape terminée. La spec de parité = `spec/src` + `spec/__tests__` (TS gelé
> de main v1.3) ; en cas d'ambiguïté, reproduire le TS à l'identique et noter
> la bizarrerie dans « Notes de chantier » ci-dessous.

## État courant

- **CHANTIER TERMINÉ (2026-07-05) — bascule effectuée.** M0-M6 finis, 151 tests
  verts, v2.0 release (13,4 Mo) installée en mise à jour par-dessus la v1.3 sur
  le A52, `spec/` supprimé, `.next` retiré et désinstallé, mergé → `main`.
- **Restes connus (non bloquants)** : test reboot→digest (BootReceiver) à observer
  à l'occasion d'un vrai redémarrage ; comportement Doze à observer sur quelques
  jours ; favoris v1.3 non migrés (stockage RN AsyncStorage ≠ DataStore — à
  ré-étoiler à la main) ; IDs de notification (cf. Notes de chantier).
- Ce document est conservé comme journal du chantier ; la doc vivante est
  CLAUDE.md / README / CONTEXT / TECHNICAL.

## Cadre (validé utilisateur, 2026-07-03)

- **Parité stricte v1.3** — aucune amélioration avant la bascule (fixes `7a09d92` fenêtre nuit et `12112eb` digest « ensemble » inclus dans la spec).
- **main gelé** (fixes critiques only) ; tout fix métier sur main → à refléter ici à la main.
- Icônes actuelles = placeholder.
- Identité : `com.almostblue`, keystore release réutilisé (`keystore.properties` racine, gitignoré, NE PAS régénérer), versionCode 5, versionName 2.0. Debug = suffixe `.next` (coexistence avec la v1.3 installée).
- Device de test : Samsung A52 (Android 14) branché en adb chez l'utilisateur.

## Architecture

Kotlin 2.1.20 / AGP 8.12 / Gradle 8.13, minSdk 24 → target 36. Compose + Material3
(tokens custom via `AppTheme.colors`, mappage M3 minimal), DataStore Preferences,
OkHttp + kotlinx.serialization, WorkManager + AlarmManager exact + BootReceiver,
MapLibre Android SDK, JUnit. R8/minify : désactivé jusqu'à M6.

## Jalons

### M0 — Branche, squelette, infra de reprise
- [x] Branche `rewrite/kotlin`, purge RN, `spec/` = référence de parité (commit `a162e78`)
- [x] Keystores + wrapper Gradle + mipmaps préservés et réintroduits
- [x] Scaffold Gradle/Compose : thème tokens v1.3 exacts (Color.kt/Dimens.kt/Theme.kt), MainActivity placeholder
- [x] `assembleDebug` OK (APK 9,2 Mo) + installé sur A52
- [x] Workflow CI gradle (`test lint assembleDebug`) — passe en local, commit `47046f2`
- [x] Mémoire `kotlin-rewrite.md` + commits M0 (`a162e78`, `fe0a344`, `47046f2`)
- **DoD** : CI verte sur la branche (à confirmer au premier push).

### M1 — Domaine pur + spec verrouillée ✅ (2026-07-03)
- [x] `domain/WeatherLogic.kt` : `ScoreWeights`, `scoreSlotNumeric`, `scoreSlotBase` (compromis slow×6h documenté), `buildForecast`, `getSubSectorSummary` (fix contiguïté nuit inclus), Paris→UTC exact via `java.time`, `nowMs` injectable pour les tests (commit `c1a314b`)
- [x] `domain/SeasonLogic.kt` sur `java.time.LocalDate`
- [x] `domain/OrientationUtils.kt` (extensions `label`/`frenchName`) et `domain/ColorUtils.kt` (`scoreGradientRgb` → triplet, la string CSS était un format RN)
- [x] Port JUnit : weatherLogic 48, seasonLogic 24, colorUtils 7, orientationUtils 3 = **82 tests verts**
- **DoD atteint** : modèle météo verrouillé.

### M2 — Data ✅ (2026-07-03)
- [x] `data/Sectors.kt` : 8 secteurs / **72** sous-secteurs (la spec en compte 72, pas 71) + test d'unicité/comptage
- [x] `data/OpenMeteoClient.kt` : params identiques, cache 1h clé `%.4f` Locale.US, dédup en vol (attente hors mutex !), base URL en BuildConfig — 8 tests
- [x] 3 repositories DataStore (Settings 11 champs / Sectors favoris ordre préservé / Notification scores JSON) — 16 tests ré-dérivés du contrat Zustand (structurels, pas de calibration)
- [x] Desugaring core-library activé (java.time exige API 26, minSdk reste 24)
- [x] Smoke test : contrat API vérifié en live sur Buoux (tous les champs hourly présents)
- **DoD atteint** : 110 tests verts au total.

### M3 — Notifications + background — code ✅, validation device ⏳
- [x] Canal `weather-alerts` HIGH ; messages FR identiques (`buildNotificationBody`, `formatNextWindow`, `buildDigestLines` + « dans son ensemble », BigText digest)
- [x] `CheckWorker` WorkManager (intervalle settings, réseau requis) : gardes saison/été, transitions !good→good, ré-armement digest auto-réparant
- [x] `DigestReceiver` + `setExactAndAllowWhileIdle` + gardes anti-doublon (contenu/jour Paris) ; `BootReceiver`
- [x] Fiabilité native : `isIgnoringBatteryOptimizations`, `canScheduleExactAlarms`, intents réglages ; permissions manifest complètes. ⚠️ Simplification assumée : pas de détection du power manager OEM (`needsPowerManager` notifee) — à trancher en M4 avec la ReliabilitySection (3e FixRow « Démarrage automatique »)
- [x] Port des 40 tests (41 avec le scheduler) — 151 tests verts au total
- [x] Vérifié par dumpsys : alarme exacte armée (`window=0`, demain 10h, `policy_permission`) + job WorkManager enregistré
- [x] **Validation grandeur nature (2026-07-04, adb + réglages injectés via run-as)** :
  alerte réelle « Falaise de Buoux — grimpable demain » / « Toutes les faces sont
  sèches ! » (check immédiat, vraie requête Open-Meteo) ; **digest tiré à 21:00:00
  pile par la vraie chaîne AlarmManager exact → DigestReceiver, app en arrière-plan**
  (« Résumé grimpe · 04/07 » / « … grimpable dans son ensemble (dès demain) ») ;
  ré-armement auto vérifié (lendemain même heure, puis 10h00 après retour aux
  défauts) ; gardes anti-doublon persistées ; notif de test OK ; CheckWorker SUCCESS.
- **DoD atteint** : tests verts ✅ + validation device ✅.

### M4 — UI Compose (hors carte) — code ✅, validé sur device (2026-07-04)
- [x] Navigation bottom bar (Secteurs/Carte/Réglages) + détail + gate hibernation (reset auto override)
- [x] SectorList (Favoris/Tous, méta, étoile), SectorDetail (badge gradient + Sec/Incertain/Humide + n.n/10, fenêtre, retry), Hibernation (🌙, date retour, « Voir quand même »), Settings complet (toggles, chips 1h-24h, HourSelector ±, MonthDayPicker 2 colonnes, ReliabilitySection, Debug ×4, À propos)
- [x] Thème clair/sombre sans flash (bascule instantanée vérifiée sur device)
- [x] Câblage réactif parité useNotificationSetup : re-planification sur changement de réglages, check immédiat 4 s avec verrou, invite fiabilité unique (`reliabilityPromptDone`)
- [x] Validé écran par écran contre la spec, par screenshots sur le A52 (liste, détail, hibernation + override, réglages complets, picker, thème clair)
- [ ] (Optionnel, utilisateur) Parcours côte à côte avec la v1.3 installée
- **DoD** : atteint hors parcours côte à côte formel.

### M5 — Carte MapLibre + panneau — code ✅ (2026-07-04), device ⏳
- [x] SDK MapLibre 11.11 + plugin annotations, raster OSM, caméra France (2.3, 46.5, z5)
- [x] Pins CircleManager 18dp bord blanc 2.5, couleur gradient max sous-secteurs, fetch parallèle tolérant (supervisorScope, une seule mise à jour d'état)
- [x] Sheet parité : 460dp fixe, spring ouverture (approx. Compose du bounciness=4) / timing 220ms fermeture, overlay 40 %, « Voir le détail → » (id capturé avant fermeture)
- [x] **Validation device (2026-07-05)** : tuiles OSM, caméra France, pins colorés par gradient (repli accent si fetch échoué, re-fetch au remontage — parité), sheet + ★ + « Voir le détail → » → écran détail. Caméra recadrée France à chaque retour d'onglet (MapView recréé, léger écart vs RN — assumé)
- **DoD atteint**.

### M6 — Finition, release, bascule — code ✅ (2026-07-04), bascule ⏳
- [x] R8/minify + shrinkResources + règles keep serialization ; `assembleRelease` OK
- [x] ABI release : `arm64-v8a` seule (libs natives MapLibre ×4 sinon) — élargir au besoin
- [x] Icônes générées depuis `almost-blue-icon-master-v2.png` (nuage) : mipmaps 48→192 + variantes rondes
- [x] `build-release.sh` recréé → `dist/almost-blue-v2.0.apk` **13,4 Mo** signé (certificat vérifié = keystore v1.3, mise à jour par-dessus possible)
- [x] Docs réécrites : CLAUDE.md / README / CONTEXT / TECHNICAL (Kotlin v2.0)
- [x] **v2.0 release installée en mise à jour par-dessus la v1.3 (2026-07-05)** — signature acceptée, aucune désinstallation
- [x] Release R8 validée sur device : hibernation + override, liste, détail (serialization OK sur données live), carte MapLibre, alarme digest armée 10h00
- [x] Cold start : v1.3 RN 420 ms (premier frame, bundle JS ensuite) vs v2.0 R8 459 ms (app complète au premier frame)
- [x] Suppression `spec/`, retrait `.next`, docs nettoyées
- [x] Digest quotidien réel de la release (cycle auto-entretenu, non forcé) — tiré à 10h00 ⏳→ voir « État courant »
- [ ] Reste (utilisateur) : test reboot→digest (BootReceiver — non testable par adb sans re-saisie du PIN) et observation Doze sur plusieurs jours
- **DoD** : APK release installé en mise à jour par-dessus la v1.3 ✅.

## Notes de chantier

- `scoreSlotBase` : compromis assumé slow×6h (roche inconnue), sans consommateur UI — sert de référence de calibration des tests. Ne pas « corriger ».
- **needsPowerManager tranché (M4)** : port fidèle de la liste OEM de notifee
  (PowerManagerUtils) SANS `<queries>` manifest, comme la v1.3 — sur Android 11+
  la résolution échoue par visibilité des packages, la FixRow « Démarrage
  automatique » n'apparaît donc que sur les vieux appareils. Parité stricte,
  ne pas « corriger » avant la bascule.
- **IDs de notification (à revoir à M6)** : `nextAlertId` repart à 100 à chaque
  process → une alerte peut en remplacer une autre après redémarrage ;
  `sendTestNotification` instancie son propre `AndroidNotifier` → la notif de
  test (id 100) écrase la première alerte du process courant. Sans gravité,
  mais comparer au comportement notifee v1.3 avant release.
- **Debug sur device** : le shell adb (uid 2000) ne peut PAS broadcaster vers un
  receiver non exporté (Android 14) — pour déclencher le digest hors UI, passer
  par l'alarme réelle (injecter `digestHour` via `run-as` + protobuf DataStore,
  cf. validation M3) ou par les boutons Debug des réglages.
- L'override d'hibernation a été consommé pendant la validation (2026-07-04) :
  l'app montre la liste jusqu'au prochain cycle saisonnier — comportement v1.3.
- `spec/` est en lecture seule : ne jamais y toucher, il reflète main v1.3.
- APK debug M0 : 9,2 Mo (vs ~25 Mo RN) — re-mesurer en release minifié à M6.
