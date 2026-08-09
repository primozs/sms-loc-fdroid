#!/usr/bin/env bash
# Stage 1 helper: cross-compile OfflineMapServerCore + JNI shim into
# android/app/src/main/jniLibs/arm64-v8a/
#
# Copies only shared libs required by NEEDED (transitive), then strips.
# Does not ship Testing/XCTest/unused Foundation* from a blanket lib*.so copy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PKG="$ROOT/native/OfflineMapServer"
OUT="$ROOT/android/app/src/main/jniLibs/arm64-v8a"
SDK_TRIPLE="aarch64-unknown-linux-android28"
# Prefer from-source F-Droid/cache SDK, then official artifactbundle layout.
_default_sdk_root() {
  local d
  for d in \
    "${SMSLOC_SWIFT_SDK_BUNDLE:-}" \
    "$HOME/.cache/smsloc-fdroid-swift/swift-6.3.3-RELEASE-android-24-0.1.artifactbundle" \
    "$HOME/.swiftpm/swift-sdks/swift-6.3.3-RELEASE-android-24-0.1.artifactbundle" \
    "$HOME/.swiftpm/swift-sdks/swift-6.3.3-RELEASE_android.artifactbundle"
  do
    [[ -n "$d" && -d "$d/swift-android" ]] && { echo "$d/swift-android"; return; }
  done
  echo ""
}
_SDK_ANDROID="$(_default_sdk_root)"
NDK_HOME="${ANDROID_NDK_HOME:-}"
if [[ -z "$NDK_HOME" || ! -d "$NDK_HOME/toolchains" ]]; then
  if [[ -n "$_SDK_ANDROID" && -d "$_SDK_ANDROID/android-ndk-r27d/toolchains" ]]; then
    NDK_HOME="$_SDK_ANDROID/android-ndk-r27d"
  else
    NDK_HOME="${HOME}/.cache/smsloc-fdroid-swift/android-ndk-r27d"
  fi
fi
SWIFT_RT="${SWIFT_ANDROID_RUNTIME:-}"
if [[ -z "$SWIFT_RT" || ! -d "$SWIFT_RT" ]]; then
  if [[ -n "$_SDK_ANDROID" ]]; then
    SWIFT_RT="$_SDK_ANDROID/swift-resources/usr/lib/swift-aarch64/android"
  fi
fi

if [[ ! -d "$NDK_HOME/toolchains" ]]; then
  echo "Set ANDROID_NDK_HOME to NDK r27d (see native/OfflineMapServer/README.md)" >&2
  exit 1
fi
if [[ ! -d "$SWIFT_RT" ]]; then
  echo "Missing Swift Android runtime at ${SWIFT_RT:-<unset>}" >&2
  exit 1
fi
# Official-layout SDKs need ndk-sysroot + clang resource links (setup-android-sdk.sh).
if [[ -n "$_SDK_ANDROID" && -x "$_SDK_ANDROID/scripts/setup-android-sdk.sh" ]]; then
  if [[ ! -e "$_SDK_ANDROID/ndk-sysroot/usr/lib/swift/android/aarch64/swiftrt.o" ]]; then
    echo "==> setup-android-sdk.sh (ndk-sysroot + clang)"
    ANDROID_NDK_HOME="$NDK_HOME" "$_SDK_ANDROID/scripts/setup-android-sdk.sh"
  fi
fi

PREBUILT="$NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64"
CC="$PREBUILT/bin/aarch64-linux-android28-clang"
STRIP="$PREBUILT/bin/llvm-strip"
JNI_H="$PREBUILT/sysroot/usr/include"
LIBCXX="$PREBUILT/sysroot/usr/lib/aarch64-linux-android/libc++_shared.so"

# System libs provided by Android — never package.
is_system_lib() {
  case "$1" in
    libc.so|libm.so|libdl.so|liblog.so|libz.so|libandroid.so) return 0 ;;
    *) return 1 ;;
  esac
}

needed_libs() {
  local so="$1"
  readelf -d "$so" 2>/dev/null \
    | sed -n 's/.*Shared library: \[\(.*\)\]/\1/p'
}

# BFS: for each .so in OUT, pull missing NEEDED from SWIFT_RT or NDK libc++.
resolve_deps() {
  local changed=1
  while [[ "$changed" -eq 1 ]]; do
    changed=0
    local so name
    for so in "$OUT"/*.so; do
      [[ -f "$so" ]] || continue
      while IFS= read -r name; do
        [[ -n "$name" ]] || continue
        if is_system_lib "$name"; then
          continue
        fi
        if [[ -f "$OUT/$name" ]]; then
          continue
        fi
        if [[ -f "$SWIFT_RT/$name" ]]; then
          cp -f "$SWIFT_RT/$name" "$OUT/$name"
          changed=1
          echo "  + $name (swift-rt)"
        elif [[ "$name" == "libc++_shared.so" && -f "$LIBCXX" ]]; then
          cp -f "$LIBCXX" "$OUT/$name"
          changed=1
          echo "  + $name (ndk)"
        else
          echo "  ! unresolved NEEDED: $name (from $(basename "$so"))" >&2
        fi
      done < <(needed_libs "$so")
    done
  done
}

strip_all() {
  # Only strip our products. llvm-strip breaks 16KB ELF load congruence on
  # from-source Swift Android runtime libs (official prebuilts survive strip).
  local so
  for so in "$OUT"/libOfflineMapServerCore.so "$OUT"/libOfflineMapServerJni.so; do
    [[ -f "$so" ]] || continue
    "$STRIP" --strip-unneeded "$so" 2>/dev/null \
      || "$STRIP" -S "$so" 2>/dev/null \
      || true
  done
}

echo "==> clean $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> swift build OfflineMapServerCore ($SDK_TRIPLE release)"
cd "$PKG"
swift build -c release --product OfflineMapServerCore --swift-sdk "$SDK_TRIPLE"

SWIFT_SO="$PKG/.build/$SDK_TRIPLE/release/libOfflineMapServerCore.so"
cp -f "$SWIFT_SO" "$OUT/"

echo "==> link JNI shim (16KB ELF page alignment)"
# Android 15+ devices may use 16KB pages; NDK default for our clang was 4KB (0x1000).
"$CC" -shared -fPIC \
  -I"$JNI_H" -I"$JNI_H/aarch64-linux-android" \
  -L"$PKG/.build/$SDK_TRIPLE/release" -lOfflineMapServerCore \
  -Wl,-z,max-page-size=16384 \
  -Wl,-z,common-page-size=16384 \
  -Wl,-rpath,'$ORIGIN' \
  -o "$OUT/libOfflineMapServerJni.so" \
  "$PKG/jni/offline_map_jni.c"

echo "==> resolve transitive NEEDED"
resolve_deps

echo "==> strip"
strip_all

echo "==> 16KB page-size check"
python3 - "$OUT" <<'PY'
import struct, os, sys
PAGE = 16384
outdir = sys.argv[1]
failed = 0
for name in sorted(os.listdir(outdir)):
    if not name.endswith(".so"):
        continue
    path = os.path.join(outdir, name)
    with open(path, "rb") as f:
        hdr = f.read(64)
    if hdr[:4] != b"\x7fELF" or hdr[4] != 2:
        print(f"SKIP {name}")
        continue
    e_phoff = struct.unpack_from("<Q", hdr, 32)[0]
    e_phentsize = struct.unpack_from("<H", hdr, 54)[0]
    e_phnum = struct.unpack_from("<H", hdr, 56)[0]
    with open(path, "rb") as f:
        f.seek(e_phoff)
        ph = f.read(e_phentsize * e_phnum)
    bad = False
    for i in range(e_phnum):
        off = i * e_phentsize
        if struct.unpack_from("<I", ph, off)[0] != 1:
            continue
        p_offset = struct.unpack_from("<Q", ph, off + 8)[0]
        p_vaddr = struct.unpack_from("<Q", ph, off + 16)[0]
        p_align = struct.unpack_from("<Q", ph, off + 48)[0]
        if p_align < PAGE or (p_vaddr % PAGE) != (p_offset % PAGE):
            bad = True
    print(("FAIL" if bad else "OK  "), name)
    failed += int(bad)
if failed:
    sys.exit(f"{failed} libraries fail 16KB ELF alignment")
PY

echo "==> packaged (gitignored — do not commit):"
ls -lhS "$OUT"
echo "total size: $(du -sh "$OUT" | cut -f1)"
# Size ceiling note: lib_FoundationICU is NEEDED via FoundationInternationalization — do not delete.
if [[ -f "$OUT/lib_FoundationICU.so" ]]; then
  echo "note: lib_FoundationICU.so present (required by FoundationInternationalization)"
fi
echo "Java loads OfflineMapServerCore then OfflineMapServerJni."
