#!/usr/bin/env bash
# F-Droid / clean-CI prebuild: Swift Android toolchain + web/native sync.
# Invoked from fdroiddata metadata with cwd = android/ (script cds to repo root).
#
# Uses the official Ubuntu 24.04 host toolchain tarball (not swiftly) because
# F-Droid's Debian Trixie buildserver is not a swiftly-recognized platform.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SWIFT_VER="${SWIFT_VER:-6.3.3}"
HOST_ID="${SWIFT_HOST_ID:-ubuntu2404}"
HOST_NAME="${SWIFT_HOST_NAME:-ubuntu24.04}"
TOOLCHAIN_DIR="$ROOT/.fdroid-swift/swift-${SWIFT_VER}-RELEASE-${HOST_NAME}"
SDK_URL="https://download.swift.org/swift-${SWIFT_VER}-release/android-sdk/swift-${SWIFT_VER}-RELEASE/swift-${SWIFT_VER}-RELEASE_android.artifactbundle.tar.gz"
SDK_CHECKSUM="d160cc3206dd1886dae3fef2337af5e25ec034692cd0ec225721c56cc69da7f5"

if [[ ! -x "$TOOLCHAIN_DIR/usr/bin/swift" ]]; then
  echo "==> install Swift ${SWIFT_VER} host toolchain (${HOST_NAME})"
  mkdir -p "$ROOT/.fdroid-swift"
  curl -fsSL -o "$ROOT/.fdroid-swift/swift.tar.gz" \
    "https://download.swift.org/swift-${SWIFT_VER}-release/${HOST_ID}/swift-${SWIFT_VER}-RELEASE/swift-${SWIFT_VER}-RELEASE-${HOST_NAME}.tar.gz"
  tar -xzf "$ROOT/.fdroid-swift/swift.tar.gz" -C "$ROOT/.fdroid-swift"
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

echo "==> fdroid-prebuild done"
