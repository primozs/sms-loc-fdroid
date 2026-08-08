#!/usr/bin/env bash
# F-Droid / clean-CI prebuild: Swift Android toolchain + web/native sync.
# Invoked from fdroiddata metadata with cwd = android/ (script cds to repo root).
#
# Host toolchain lives under $HOME (outside the VCS checkout) so fdroid's binary
# scanner does not trip on Swift static libs. jniLibs are built here and listed
# under scanignore in the metadata (built from source + official Swift Android SDK).
#
# Capacitor Gradle includes plugins from ../node_modules/.../android — keep those
# trees; only strip scanner-flagged blobs that the Android build does not need.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SWIFT_VER="${SWIFT_VER:-6.3.3}"
HOST_ID="${SWIFT_HOST_ID:-ubuntu2404}"
HOST_NAME="${SWIFT_HOST_NAME:-ubuntu24.04}"
CACHE_ROOT="${SMSLOC_SWIFT_CACHE:-$HOME/.cache/smsloc-fdroid-swift}"
TOOLCHAIN_DIR="$CACHE_ROOT/swift-${SWIFT_VER}-RELEASE-${HOST_NAME}"
SDK_URL="https://download.swift.org/swift-${SWIFT_VER}-release/android-sdk/swift-${SWIFT_VER}-RELEASE/swift-${SWIFT_VER}-RELEASE_android.artifactbundle.tar.gz"
SDK_CHECKSUM="d160cc3206dd1886dae3fef2337af5e25ec034692cd0ec225721c56cc69da7f5"

if [[ ! -x "$TOOLCHAIN_DIR/usr/bin/swift" ]]; then
  echo "==> install Swift ${SWIFT_VER} host toolchain (${HOST_NAME}) into $CACHE_ROOT"
  mkdir -p "$CACHE_ROOT"
  curl -fsSL -o "$CACHE_ROOT/swift.tar.gz" \
    "https://download.swift.org/swift-${SWIFT_VER}-release/${HOST_ID}/swift-${SWIFT_VER}-RELEASE/swift-${SWIFT_VER}-RELEASE-${HOST_NAME}.tar.gz"
  tar -xzf "$CACHE_ROOT/swift.tar.gz" -C "$CACHE_ROOT"
fi
export PATH="$TOOLCHAIN_DIR/usr/bin:$PATH"
swift --version

if ! swift sdk list 2>/dev/null | grep -q "swift-${SWIFT_VER}-RELEASE_android"; then
  echo "==> install Swift Android SDK ${SWIFT_VER}"
  swift sdk install "$SDK_URL" --checksum "$SDK_CHECKSUM"
fi

SDK_ROOT="${HOME}/.swiftpm/swift-sdks/swift-${SWIFT_VER}-RELEASE_android.artifactbundle/swift-android"
if [[ ! -d "$SDK_ROOT/android-ndk-r27d" ]]; then
  echo "==> install NDK r27d into Swift Android SDK"
  (
    cd "$SDK_ROOT"
    curl -fSL -o ndk.zip \
      "https://dl.google.com/android/repository/android-ndk-r27d-linux.zip"
    unzip -qo ndk.zip
    export ANDROID_NDK_HOME="$PWD/android-ndk-r27d"
    ./scripts/setup-android-sdk.sh
  )
fi
export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-$SDK_ROOT/android-ndk-r27d}"

echo "==> yarn + configure + jniLibs + ionic-sync"
yarn install --frozen-lockfile
yarn configure:prod -y
./native/OfflineMapServer/scripts/package-android-jni.sh
yarn ionic-sync

# Keep Capacitor android/ projects in node_modules; drop non-Gradle blobs that
# trip fdroid's binary scanner (from a prior CI scan of this tree).
echo "==> cleanup scanner blobs (keep node_modules android sources)"
rm -rf \
  native/OfflineMapServer/.build \
  .fdroid-swift \
  "$ROOT"/.swiftpm
rm -f \
  node_modules/@capacitor/cli/assets/*.tar.gz \
  node_modules/@trapezedev/gradle-parse/capacitor-gradle-parse.jar \
  node_modules/@trapezedev/gradle-parse/lib/*.jar \
  node_modules/sql.js/dist/*.wasm \
  node_modules/@one-ini/wasm/*.wasm \
  node_modules/jszip/.jekyll-metadata

echo "==> fdroid-prebuild done"
