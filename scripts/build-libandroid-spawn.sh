#!/usr/bin/env bash
# Build libandroid-spawn.so (+ .a + spawn.h) from vendored Termux/AOSP source.
# No packages.termux.dev binaries.
#
# Usage:
#   ANDROID_NDK_HOME=… ./scripts/build-libandroid-spawn.sh [DESTDIR]
# Writes:
#   DESTDIR/lib/libandroid-spawn.so
#   DESTDIR/lib/libandroid-spawn.a
#   DESTDIR/include/spawn.h
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/native/libandroid-spawn"
DEST="${1:-}"

NDK_HOME="${ANDROID_NDK_HOME:-${ANDROID_NDK:-${NDK:-}}}"
if [[ -z "$NDK_HOME" || ! -d "$NDK_HOME/toolchains" ]]; then
  echo "missing ANDROID_NDK_HOME (need NDK r27d with toolchains/)" >&2
  exit 1
fi
if [[ ! -f "$SRC/posix_spawn.cpp" || ! -f "$SRC/spawn.h" ]]; then
  echo "missing vendored source under $SRC" >&2
  exit 1
fi

API="${SMSLOC_SPAWN_API:-28}"
PREBUILT="$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64"
CXX="$PREBUILT/bin/aarch64-linux-android${API}-clang++"
AR="$PREBUILT/bin/llvm-ar"
[[ -x "$CXX" ]] || { echo "missing $CXX" >&2; exit 1; }

if [[ -z "$DEST" ]]; then
  DEST="${SMSLOC_SPAWN_DEST:-$ROOT/native/libandroid-spawn/out}"
fi
mkdir -p "$DEST/lib" "$DEST/include"
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT

echo "==> compile libandroid-spawn (API ${API}, 16KB pages) → $DEST"
"$CXX" -c -fPIC -O2 \
  -D_GNU_SOURCE \
  -I"$SRC" \
  -o "$BUILD/posix_spawn.o" \
  "$SRC/posix_spawn.cpp"

"$CXX" -shared -fPIC \
  -Wl,-z,max-page-size=16384 \
  -Wl,-z,common-page-size=16384 \
  -Wl,-soname,libandroid-spawn.so \
  -o "$DEST/lib/libandroid-spawn.so" \
  "$BUILD/posix_spawn.o" \
  -lc++_shared

"$AR" rcu "$DEST/lib/libandroid-spawn.a" "$BUILD/posix_spawn.o"
cp -f "$SRC/spawn.h" "$DEST/include/spawn.h"
# Keep posix_spawn.h name for the #include in posix_spawn.cpp when compiling elsewhere.
cp -f "$SRC/posix_spawn.h" "$DEST/include/posix_spawn.h"

echo "    $(ls -lh "$DEST/lib/libandroid-spawn.so" | awk '{print $5, $9}')"
