#!/usr/bin/env bash
# F-Droid / clean-CI prebuild: rebuild Swift Android runtime from source, then
# package OfflineMapServer jniLibs + sync the web app into android/.
#
# Invoked from fdroiddata metadata with cwd = android/ (script cds to repo root).
#
# Host Swift toolchain + from-source Android SDK live under $HOME (outside the
# VCS checkout) so fdroid's binary scanner does not trip on build tools.
# Target .so files under jniLibs are produced here and listed under scanignore.
#
# Do NOT pull a published Docker/GHCR SDK image here — F-Droid must rebuild.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SWIFT_VER="${SWIFT_VER:-6.3.3}"
CACHE_ROOT="${SMSLOC_SWIFT_CACHE:-$HOME/.cache/smsloc-fdroid-swift}"
BUNDLE_NAME="swift-${SWIFT_VER}-RELEASE-android-24-0.1.artifactbundle"
BUNDLE_OUT="${SMSLOC_SWIFT_SDK_BUNDLE:-$CACHE_ROOT/$BUNDLE_NAME}"
SDK_ID="swift-${SWIFT_VER}-RELEASE_android"

export PATH="${HOME}/.local/bin:/usr/local/bin:$PATH"
export SMSLOC_SWIFT_CACHE="$CACHE_ROOT"

echo "==> rebuild Swift Android SDK from source (stdlib/Dispatch/Foundation)"
./scripts/build-swift-android-sdk.sh
[[ -d "$BUNDLE_OUT/swift-android" ]] \
  || { echo "missing SDK bundle at $BUNDLE_OUT" >&2; exit 1; }

# Host compiler PATH (build script installed it under CACHE_ROOT).
TOOLCHAIN_DIR="$CACHE_ROOT/swift-${SWIFT_VER}-RELEASE-ubuntu24.04"
if [[ ! -x "$TOOLCHAIN_DIR/usr/bin/swift" ]]; then
  # allow alternate host id layouts
  shopt -s nullglob
  for d in "$CACHE_ROOT"/swift-${SWIFT_VER}-RELEASE-*/usr/bin/swift; do
    TOOLCHAIN_DIR="$(cd "$(dirname "$d")/../.." && pwd)"
    break
  done
  shopt -u nullglob
fi
export PATH="$TOOLCHAIN_DIR/usr/bin:$PATH"
swift --version

echo "==> register SDK with swiftpm ($SDK_ID)"
# Same artifact id as the official download; remove any prior install first.
if swift sdk list 2>/dev/null | grep -q "$SDK_ID"; then
  swift sdk remove "$SDK_ID" || true
fi
swift sdk install "$BUNDLE_OUT"

export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-$CACHE_ROOT/android-ndk-r27d}"
[[ -d "$ANDROID_NDK_HOME/toolchains" ]] \
  || { echo "missing NDK at $ANDROID_NDK_HOME" >&2; exit 1; }
# Prefer the just-installed copy under ~/.swiftpm for setup + packaging.
SDK_ROOT=""
for d in "$HOME/.swiftpm/swift-sdks"/*/swift-android; do
  if [[ -d "$d" ]]; then SDK_ROOT="$d"; break; fi
done
if [[ -z "$SDK_ROOT" ]]; then
  SDK_ROOT="$BUNDLE_OUT/swift-android"
fi
export SMSLOC_SWIFT_SDK_BUNDLE="$(dirname "$SDK_ROOT")"
if [[ -x "$SDK_ROOT/scripts/setup-android-sdk.sh" \
      && ! -e "$SDK_ROOT/ndk-sysroot/usr/lib/swift/android/aarch64/swiftrt.o" ]]; then
  echo "==> setup-android-sdk.sh"
  ( cd "$SDK_ROOT" && ANDROID_NDK_HOME="$ANDROID_NDK_HOME" ./scripts/setup-android-sdk.sh )
fi

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
