#!/usr/bin/env bash
# Unsigned release APK the way F-Droid should build it (no keystore signing).
# Requires: yarn, Node, Android SDK, Swift 6.3.3 + Android Swift SDK (see docs/fdroid.md).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> yarn install"
yarn install --frozen-lockfile

echo "==> configure:prod (copies config; keeps versionCode from android/app/build.gradle)"
yarn configure:prod -y

echo "==> package Swift OfflineMapServer jniLibs (arm64-v8a)"
./native/OfflineMapServer/scripts/package-android-jni.sh

echo "==> ionic/capacitor sync (web assets + native plugins)"
yarn ionic-sync

echo "==> assembleRelease (unsigned)"
(
  cd android
  ./gradlew assembleRelease
)

APK="android/app/build/outputs/apk/release/app-release-unsigned.apk"
if [[ ! -f "$APK" ]]; then
  # AGP may name it app-release.apk when no signingConfig is set
  APK="android/app/build/outputs/apk/release/app-release.apk"
fi
if [[ ! -f "$APK" ]]; then
  echo "APK not found under android/app/build/outputs/apk/release/" >&2
  ls -la android/app/build/outputs/apk/release/ >&2 || true
  exit 1
fi

echo "OK: $APK"
ls -lh "$APK"
