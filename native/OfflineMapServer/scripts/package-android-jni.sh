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
SWIFT_VER="${SWIFT_VER:-6.2.3}"
# Prefer explicit artifact id so a leftover 6.3.x SDK does not win on triple match.
SWIFT_SDK_ID="${SWIFT_SDK_ID:-swift-${SWIFT_VER}-RELEASE_android}"
# Prefer from-source F-Droid/cache SDK, then official artifactbundle layout.
_default_sdk_root() {
  local d
  local ver="$SWIFT_VER"
  for d in \
    "${SMSLOC_SWIFT_SDK_BUNDLE:-}" \
    "$HOME/.cache/smsloc-fdroid-swift/swift-${ver}-RELEASE-android-24-0.1.artifactbundle" \
    "$HOME/.swiftpm/swift-sdks/swift-${ver}-RELEASE-android-24-0.1.artifactbundle" \
    "$HOME/.swiftpm/swift-sdks/swift-${ver}-RELEASE_android.artifactbundle"
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
# Termux sysroot libs (libandroid-spawn) from the from-source SDK build.
EXTRA_LIB_DIRS=()
for d in \
  "${SMSLOC_SWIFT_EXTRA_LIBS:-}" \
  "${_SDK_ANDROID:+$_SDK_ANDROID/termux-libs}" \
  "$HOME/.cache/smsloc-fdroid-swift/sdk-build-swift-${SWIFT_VER}-RELEASE-aarch64-api24/swift-release-android-aarch64-24-sdk/usr/lib"
do
  [[ -n "$d" && -d "$d" ]] && EXTRA_LIB_DIRS+=("$d")
done

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

# BFS: for each .so in OUT, pull missing NEEDED from SWIFT_RT, Termux sysroot, or NDK.
resolve_deps() {
  local changed=1 unresolved=0
  while [[ "$changed" -eq 1 ]]; do
    changed=0
    local so name extra found
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
        found=0
        if [[ -f "$SWIFT_RT/$name" ]]; then
          cp -f "$SWIFT_RT/$name" "$OUT/$name"
          found=1
          echo "  + $name (swift-rt)"
        elif [[ "$name" == "libc++_shared.so" && -f "$LIBCXX" ]]; then
          cp -f "$LIBCXX" "$OUT/$name"
          found=1
          echo "  + $name (ndk)"
        elif [[ "$name" == "libandroid-spawn.so" ]]; then
          # Termux .so is 4KB-aligned; relink from .a with 16KB pages.
          if ensure_android_spawn_16k; then
            found=1
            echo "  + $name (relinked 16KB)"
          fi
        else
          for extra in "${EXTRA_LIB_DIRS[@]+"${EXTRA_LIB_DIRS[@]}"}"; do
            if [[ -f "$extra/$name" ]]; then
              cp -f "$extra/$name" "$OUT/$name"
              found=1
              echo "  + $name (extra:$extra)"
              break
            fi
          done
        fi
        if [[ "$found" -eq 1 ]]; then
          changed=1
        else
          echo "  ! unresolved NEEDED: $name (from $(basename "$so"))" >&2
          unresolved=1
        fi
      done < <(needed_libs "$so")
    done
  done
  [[ "$unresolved" -eq 0 ]] || exit 1
}

ensure_android_spawn_16k() {
  local a=""
  local d
  for d in "${EXTRA_LIB_DIRS[@]+"${EXTRA_LIB_DIRS[@]}"}"; do
    if [[ -f "$d/libandroid-spawn.a" ]]; then
      a="$d/libandroid-spawn.a"
      break
    fi
  done
  [[ -n "$a" ]] || return 1
  "$CC" -shared -fPIC -fuse-ld=lld \
    -Wl,--whole-archive "$a" -Wl,--no-whole-archive \
    -Wl,-z,max-page-size=16384 \
    -Wl,-z,common-page-size=16384 \
    -Wl,-soname,libandroid-spawn.so \
    -o "$OUT/libandroid-spawn.so"
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

echo "==> swift build OfflineMapServerCore ($SDK_TRIPLE / $SWIFT_SDK_ID release)"
cd "$PKG"
# Skip rebuild when SMSLOC_JNI_REUSE_BUILD=1 and a product already exists (local spike).
if [[ "${SMSLOC_JNI_REUSE_BUILD:-0}" == "1" ]] \
   && compgen -G "$PKG/.build/aarch64-unknown-linux-android*/release/libOfflineMapServerCore.so" >/dev/null; then
  echo "    reusing existing OfflineMapServerCore.so"
else
  rm -rf "$PKG/.build"
  if ! swift build -c release --product OfflineMapServerCore \
        --swift-sdk "${SDK_TRIPLE}" 2>/tmp/smsloc-swift-build.err; then
    cat /tmp/smsloc-swift-build.err >&2 || true
    swift build -c release --product OfflineMapServerCore --swift-sdk "$SWIFT_SDK_ID"
  fi
fi

SWIFT_SO=""
shopt -s nullglob
for cand in "$PKG"/.build/aarch64-unknown-linux-android*/release/libOfflineMapServerCore.so; do
  SWIFT_SO="$cand"
  break
done
shopt -u nullglob
[[ -n "$SWIFT_SO" && -f "$SWIFT_SO" ]] \
  || { echo "missing OfflineMapServerCore.so under $PKG/.build" >&2; exit 1; }
BUILD_DIR="$(dirname "$SWIFT_SO")"
SDK_TRIPLE="$(basename "$(dirname "$BUILD_DIR")")"
echo "    product: $SWIFT_SO"
cp -f "$SWIFT_SO" "$OUT/"

echo "==> link JNI shim (16KB ELF page alignment)"
# Android 15+ devices may use 16KB pages; NDK default for our clang was 4KB (0x1000).
"$CC" -shared -fPIC \
  -I"$JNI_H" -I"$JNI_H/aarch64-linux-android" \
  -L"$BUILD_DIR" -lOfflineMapServerCore \
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
