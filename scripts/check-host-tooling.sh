#!/usr/bin/env bash
# Assert F-Droid host tooling does not curl NDK/CMake/patchelf, and the
# draft recipe pins ndk: r27d + Debian cmake/patchelf.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK_SH="$ROOT/scripts/build-swift-android-sdk.sh"
META="$ROOT/docs/fdroid/metadata/si.stenar.smsloc.yml"
fail=0

assert_absent() {
  local pat="$1" label="$2"
  if grep -Eiq "$pat" "$SDK_SH"; then
    echo "FAIL: $SDK_SH still references $label" >&2
    grep -Ein "$pat" "$SDK_SH" >&2 || true
    fail=1
  else
    echo "OK: no $label in build-swift-android-sdk.sh"
  fi
}

assert_absent 'dl\.google\.com/android/repository' 'Google NDK zip URL'
assert_absent 'Kitware/CMake' 'Kitware CMake tarball URL'
assert_absent 'NixOS/patchelf' 'NixOS patchelf tarball URL'

if grep -Eq '^[[:space:]]*ndk:[[:space:]]*r27d[[:space:]]*$' "$META"; then
  echo "OK: metadata has ndk: r27d"
else
  echo "FAIL: $META missing ndk: r27d" >&2
  fail=1
fi

if grep -Eq '(^|[[:space:]])cmake([[:space:]]|$)' "$META" \
  && grep -Eq '(^|[[:space:]])patchelf([[:space:]]|$)' "$META"; then
  echo "OK: metadata sudo installs cmake and patchelf"
else
  echo "FAIL: $META sudo must install cmake and patchelf" >&2
  fail=1
fi

exit "$fail"
