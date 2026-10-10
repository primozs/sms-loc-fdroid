#!/usr/bin/env bash
# Assert Termux sysroot debs are not fetched for the Swift Android SDK.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift"
fail=0

# Default assignment only (BUILD_SWIFT_PM may still append ncurses/libsqlite).
assign="$(grep -E '^var termuxPackages' "$SRC" | head -1 || true)"
if [[ -z "$assign" ]]; then
  echo "FAIL: $SRC missing var termuxPackages assignment" >&2
  fail=1
elif printf '%s\n' "$assign" | grep -Eq '"[^"]+"'; then
  echo "FAIL: default termuxPackages still lists packages: $assign" >&2
  fail=1
else
  echo "OK: default termuxPackages is empty"
fi

if grep -Eq '"libandroid-execinfo"' "$SRC"; then
  echo "FAIL: $SRC still lists Termux package libandroid-execinfo" >&2
  fail=1
else
  echo "OK: no Termux package libandroid-execinfo"
fi

# Match package-name strings in the Termux fetch list / += lines.
termux_list="$(sed -n '/var termuxPackages/,/^}/p' "$SRC")"

# Spawn is from-source; must not appear in Termux fetch list.
for drop in libandroid-spawn libandroid-spawn-static libcurl zlib libxml2 \
            libnghttp3 libnghttp2 libssh2 openssl liblzma libiconv; do
  if printf '%s\n' "$termux_list" | grep -Eq "\"$drop\""; then
    echo "FAIL: $SRC still lists Termux package $drop" >&2
    fail=1
  else
    echo "OK: no Termux package $drop"
  fi
done

BUILD_SH="$ROOT/scripts/build-swift-android-sdk.sh"
if grep -q -- '--static-libxml2' "$BUILD_SH"; then
  echo "OK: build script builds libxml2 from source (--static-libxml2)"
else
  echo "FAIL: $BUILD_SH missing --static-libxml2 (Foundation needs LibXml2)" >&2
  fail=1
fi

# Match build-script flags only (ignore ponytail comment mentioning --xctest).
if grep -E '^[[:space:]]*--(install-)?xctest([[:space:]]|\\|$)' "$BUILD_SH" >/dev/null; then
  echo "FAIL: $BUILD_SH still enables XCTest (needs execinfo / unused for product)" >&2
  fail=1
else
  echo "OK: SDK build skips XCTest"
fi

SPAWN_SH="$ROOT/scripts/build-libandroid-spawn.sh"
SPAWN_SRC="$ROOT/native/libandroid-spawn/posix_spawn.cpp"
if [[ -x "$SPAWN_SH" && -f "$SPAWN_SRC" ]]; then
  echo "OK: libandroid-spawn from-source script + vendored cpp"
else
  echo "FAIL: missing $SPAWN_SH or $SPAWN_SRC" >&2
  fail=1
fi

# Non-comment lines only (comments may mention packages.termux.dev).
if grep -n 'packages.termux.dev' "$SRC" | grep -v '//' | grep -Eqi 'spawn'; then
  echo "FAIL: spawn still referenced with packages.termux.dev fetch path" >&2
  fail=1
else
  echo "OK: spawn not fetched from packages.termux.dev"
fi

exit "$fail"
