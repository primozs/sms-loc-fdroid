#!/usr/bin/env bash
# F-Droid / clean-CI prebuild: Swift Android toolchain + web/native sync.
# Invoked from fdroiddata metadata with cwd = android/ (script cds to repo root).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SWIFTLY_VER="${SWIFTLY_VER:-1.1.2}"
SWIFT_VER="${SWIFT_VER:-6.3.3}"
SDK_URL="https://download.swift.org/swift-${SWIFT_VER}-release/android-sdk/swift-${SWIFT_VER}-RELEASE/swift-${SWIFT_VER}-RELEASE_android.artifactbundle.tar.gz"
SDK_CHECKSUM="d160cc3206dd1886dae3fef2337af5e25ec034692cd0ec225721c56cc69da7f5"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|aarch64) ;;
  arm64) ARCH=aarch64 ;;
  *) echo "unsupported arch: $ARCH" >&2; exit 1 ;;
esac

if ! command -v swift >/dev/null 2>&1 || ! swift --version 2>/dev/null | grep -q "$SWIFT_VER"; then
  echo "==> install swiftly ${SWIFTLY_VER} + Swift ${SWIFT_VER}"
  curl -fsSL -o swiftly.tar.gz \
    "https://download.swift.org/swiftly/linux/swiftly-${SWIFTLY_VER}-${ARCH}.tar.gz"
  tar -zxf swiftly.tar.gz
  ./swiftly init --assume-yes --skip-install
  # shellcheck disable=SC1090
  . "${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/env.sh"
  hash -r || true
  swiftly install "$SWIFT_VER"
  swiftly use "$SWIFT_VER"
else
  # shellcheck disable=SC1090
  [ -f "${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/env.sh" ] && \
    . "${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/env.sh"
fi

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
