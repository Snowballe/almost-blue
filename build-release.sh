#!/usr/bin/env bash
# Construit l'APK release signé et le dépose dans dist/.
# Prérequis : keystore.properties à la racine (gitignoré — sinon signature debug).
set -euo pipefail
cd "$(dirname "$0")"

./gradlew assembleRelease

VERSION=$(grep -oP 'versionName = "\K[^"]+' app/build.gradle.kts)
mkdir -p dist
cp app/build/outputs/apk/release/app-release.apk "dist/almost-blue-v${VERSION}.apk"

echo "✔ dist/almost-blue-v${VERSION}.apk ($(du -h "dist/almost-blue-v${VERSION}.apk" | cut -f1))"
