#!/usr/bin/env bash
# Assert unused Termux sysroot debs are not fetched for the Swift Android SDK.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift"
fail=0

# Match only the termuxPackages array so comments / other strings do not false-fail.
termux_list="$(sed -n '/var termuxPackages/,/^]/p' "$SRC")"

# Spawn is from-source (Task 4); must not appear in Termux fetch list.
for drop in libandroid-spawn libandroid-spawn-static libcurl zlib libxml2 \
            libnghttp3 libnghttp2 libssh2 openssl liblzma libiconv; do
  if printf '%s\n' "$termux_list" | grep -Eq "\"$drop\""; then
    echo "FAIL: $SRC still lists Termux package $drop" >&2
    fail=1
  else
    echo "OK: no Termux package $drop"
  fi
done

# execinfo may remain until Testing no longer needs backtrace().
if printf '%s\n' "$termux_list" | grep -Eq '"libandroid-execinfo"'; then
  echo "OK: still lists libandroid-execinfo (Testing backtrace)"
else
  echo "note: libandroid-execinfo not listed (ok if Testing dropped)"
fi

BUILD_SH="$ROOT/scripts/build-swift-android-sdk.sh"
if grep -q -- '--static-libxml2' "$BUILD_SH"; then
  echo "OK: build script builds libxml2 from source (--static-libxml2)"
else
  echo "FAIL: $BUILD_SH missing --static-libxml2 (Foundation needs LibXml2)" >&2
  fail=1
fi

SPAWN_SH="$ROOT/scripts/build-libandroid-spawn.sh"
SPAWN_SRC="$ROOT/native/libandroid-spawn/posix_spawn.cpp"
if [[ -x "$SPAWN_SH" && -f "$SPAWN_SRC" ]]; then
  echo "OK: libandroid-spawn from-source script + vendored cpp"
else
  echo "FAIL: missing $SPAWN_SH or $SPAWN_SRC" >&2
  fail=1
fi

if grep -n 'packages.termux.dev' "$SRC" | grep -q spawn; then
  echo "FAIL: spawn still referenced with packages.termux.dev fetch path" >&2
  fail=1
else
  echo "OK: spawn not fetched from packages.termux.dev"
fi

exit "$fail"
