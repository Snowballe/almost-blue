# Réécriture Kotlin — plan de travail et état d'avancement

> **Document de reprise inter-sessions.** Toute session (humaine ou Claude) qui
> reprend ce chantier commence ici : lire « État courant », exécuter
> « Prochaine action ». Mettre à jour ce fichier et committer après CHAQUE
> étape terminée. La spec de parité = `spec/src` + `spec/__tests__` (TS gelé
> de main v1.3) ; en cas d'ambiguïté, reproduire le TS à l'identique et noter
> la bizarrerie dans « Notes de chantier » ci-dessous.

## État courant

- **Jalon en cours : M1** (M0 terminé le 2026-07-03 : scaffold buildé, installé sur A52, CI gradle en place)
- **Prochaine action : M1** — créer `app/src/main/java/com/almostblue/domain/WeatherLogic.kt` (port 1:1 de `spec/src/utils/weatherLogic.ts`) puis porter les 48 tests de `spec/__tests__/utils/weatherLogic.test.ts` en JUnit.

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

### M1 — Domaine pur + spec verrouillée
- [ ] `domain/WeatherLogic.kt` : `SCORE_WEIGHTS`, `scoreSlotNumeric`, `scoreSlotBase` (compromis slow×6h documenté), `buildForecast`, `getSubSectorSummary` (fix contiguïté nuit inclus), Paris→UTC via `java.time`
- [ ] `domain/SeasonLogic.kt` (encode m*100+d, fenêtre croisant 31/12, dégénéré, `nextSeasonChangeDate`, fév=28)
- [ ] `domain/OrientationUtils.kt` (LABEL flèches + FR) et `domain/ColorUtils.kt` (gradient rouge→jaune→vert, `rgb(r,g,b)`)
- [ ] Port JUnit : weatherLogic (48), seasonLogic (22), colorUtils (7), orientationUtils — mêmes valeurs, date figée 2026-06-15T10:00Z
- **DoD** : ~80 tests verts.

### M2 — Data
- [ ] `data/Sectors.kt` : 8 secteurs / 71 sous-secteurs transcrits de `spec/src/data/sectors.ts`
- [ ] `data/OpenMeteoClient.kt` : params identiques (hourly 6 champs, forecast_days=3, timezone Europe/Paris), cache 1h clé `%.4f,%.4f`, dédup en vol ; base URL en BuildConfig
- [ ] 3 repositories DataStore = champs/défauts des stores Zustand (settings 11 champs, favoris, lastScores/digest)
- [ ] Port tests openMeteo (8) + stores (~44)
- **DoD** : tests verts + smoke test fetch Buoux.

### M3 — Notifications + background
- [ ] Canal `weather-alerts` HIGH ; messages FR identiques (`buildNotificationBody`, `formatNextWindow`, `buildDigestLines` + « dans son ensemble », BigText digest)
- [ ] `CheckWorker` WorkManager (intervalle settings, réseau requis) : gardes saison/été, transitions !good→good, ré-armement digest auto-réparant
- [ ] `DigestReceiver` + `setExactAndAllowWhileIdle` + gardes anti-doublon (contenu/jour Paris) ; `BootReceiver`
- [ ] Fiabilité native : `isIgnoringBatteryOptimizations`, `canScheduleExactAlarms`, intents réglages ; permissions manifest (INTERNET, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, USE_EXACT_ALARM, SCHEDULE_EXACT_ALARM, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
- [ ] Port des 40 tests notificationService
- **DoD** : tests verts + validation device (notif test, check forcé, digest à l'heure pile app fermée sur une nuit).

### M4 — UI Compose (hors carte)
- [ ] Navigation bottom bar (Secteurs/Carte/Réglages) + détail + gate hibernation (reset auto override)
- [ ] SectorList (Favoris/Tous, méta, étoile), SectorDetail (badge gradient + Sec/Incertain/Humide + n.n/10, fenêtre, retry), Hibernation (🌙, date retour, « Voir quand même »), Settings complet (toggles, chips 1h-24h, HourSelector ±, MonthDayPicker 2 colonnes, ReliabilitySection, Debug ×4, À propos)
- [ ] Thème clair/sombre sans flash
- **DoD** : parcours device côte à côte avec v1.3.

### M5 — Carte MapLibre + panneau
- [ ] SDK MapLibre, raster OSM, caméra France (2.3, 46.5, z5)
- [ ] Pins 18dp bord blanc, couleur gradient max sous-secteurs, fetch parallèle tolérant
- [ ] Sheet parité : 460dp fixe, spring ouverture / timing 220ms fermeture, overlay 40 %, « Voir le détail → »
- **DoD** : device vs v1.3.

### M6 — Finition, release, bascule
- [ ] R8/minify + test complet ; icônes placeholder ; retrait `.next`
- [ ] `build-release.sh` recréé (assembleRelease → dist/almost-blue-v2.0.apk)
- [ ] Checklist parité device (hibernation, été, reboot→digest, Doze) validée par l'utilisateur
- [ ] Docs réécrites (CLAUDE.md/README/CONTEXT/TECHNICAL), suppression `spec/`, mémoires à jour
- [ ] Merge → main ; mesure APK + cold start vs v1.3
- **DoD** : APK release installé en mise à jour par-dessus la v1.3.

## Notes de chantier

- `scoreSlotBase` : compromis assumé slow×6h (roche inconnue), sans consommateur UI — sert de référence de calibration des tests. Ne pas « corriger ».
- `spec/` est en lecture seule : ne jamais y toucher, il reflète main v1.3.
- APK debug M0 : 9,2 Mo (vs ~25 Mo RN) — re-mesurer en release minifié à M6.
