#!/usr/bin/env bash
#
# Build un APK release signé et le copie dans dist/ avec un nom versionné.
# Nécessite android/keystore.properties (voir TECHNICAL.md § Signature & build release).
#
# Usage : ./scripts/build-release.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f android/keystore.properties ]; then
  echo "✗ android/keystore.properties manquant — impossible de signer le release." >&2
  echo "  Voir TECHNICAL.md § « Signature & build release »." >&2
  exit 1
fi

VERSION=$(grep -oP 'versionName "\K[^"]+' android/app/build.gradle)
echo "→ Build release Almost Blue v${VERSION}"

(cd android && ./gradlew assembleRelease --no-daemon)

mkdir -p dist
OUT="dist/almost-blue-v${VERSION}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"

echo "✓ ${OUT}"
