#!/usr/bin/env bash
# Rebuild the Swift Android SDK (stdlib + Dispatch + Foundation) from source.
#
# Used by:
#   - scripts/fdroid-prebuild.sh  (F-Droid: always from source)
#   - deploy/docker/swift-android-sdk/Dockerfile  (published cache for local/CI)
#
# Host Swift: prefer Debian/system `swiftlang` (F-Droid). Fall back to a
# Swift.org host tarball for local-dev only. NDK comes from ANDROID_NDK_HOME
# (F-Droid recipe `ndk: r27d`) or an already-installed cache dir — never
# curled. CMake ≥3.26 and patchelf must be on PATH (Debian packages).
# Target Android libs are compiled here. Based on finagolfin/swift-android-sdk.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/native/OfflineMapServer/swift-android-sdk"

# Match Debian forky/sid swiftlang (Package.swift tools-version 6.2).
SWIFT_VER="${SWIFT_VER:-6.2.3}"
SWIFT_TAG="${SWIFT_TAG:-swift-${SWIFT_VER}-RELEASE}"
# Local-dev host tarball: ubuntu24.04 needs glibc ≥2.38; jammy hosts use 22.04.
# Avoid `head` in pipelines under pipefail (SIGPIPE → exit 141).
if [[ -z "${SWIFT_HOST_ID:-}" || -z "${SWIFT_HOST_NAME:-}" ]]; then
  _glibc_line="$(ldd --version 2>/dev/null)" || true
  _glibc_minor="$(printf '%s\n' "$_glibc_line" | sed -n '1s/.* \([0-9]\+\)\.\([0-9]\+\).*/\2/p')"
  if [[ "${_glibc_minor:-0}" -lt 38 ]]; then
    HOST_ID=ubuntu2204
    HOST_NAME=ubuntu22.04
  else
    HOST_ID=ubuntu2404
    HOST_NAME=ubuntu24.04
  fi
  unset _glibc_line _glibc_minor
else
  HOST_ID="$SWIFT_HOST_ID"
  HOST_NAME="$SWIFT_HOST_NAME"
fi
ANDROID_ARCH="${ANDROID_ARCH:-aarch64}"
ANDROID_API="${ANDROID_API:-24}"
NDK_VERSION="${NDK_VERSION:-r27d}"
CACHE_ROOT="${SMSLOC_SWIFT_CACHE:-$HOME/.cache/smsloc-fdroid-swift}"
WORK="$CACHE_ROOT/sdk-build-${SWIFT_TAG}-${ANDROID_ARCH}-api${ANDROID_API}"
TOOLCHAIN_DIR="$CACHE_ROOT/${SWIFT_TAG}-${HOST_NAME}"
BUNDLE_NAME="${SWIFT_TAG}-android-${ANDROID_API}-0.1.artifactbundle"
BUNDLE_OUT="${SMSLOC_SWIFT_SDK_BUNDLE:-$CACHE_ROOT/$BUNDLE_NAME}"
# Ignore a leftover SMSLOC_SWIFT_SDK_BUNDLE that points at a different SWIFT_TAG
# (e.g. 6.3.3 path while building 6.2.3).
if [[ -n "${SMSLOC_SWIFT_SDK_BUNDLE:-}" && "$BUNDLE_OUT" != *"${SWIFT_TAG}"* ]]; then
  echo "==> ignoring SMSLOC_SWIFT_SDK_BUNDLE=$BUNDLE_OUT (does not match ${SWIFT_TAG})"
  BUNDLE_OUT="$CACHE_ROOT/$BUNDLE_NAME"
fi
KEEP_WORK="${SMSLOC_SWIFT_SDK_KEEP_WORK:-0}"
# Set when host swiftc comes from Debian/system (not Swift.org tarball).
USE_SYSTEM_SWIFT=0
# Force Swift.org host tarball even if system swift exists (local experiments).
FORCE_HOST_TARBALL="${SMSLOC_SWIFT_FORCE_HOST_TARBALL:-0}"

# Host tools: Debian/F-Droid packages on PATH (cmake ≥3.26, patchelf). No tarball fetch.
export PATH="${HOME}/.local/bin:/usr/local/bin:$PATH"
mkdir -p "$CACHE_ROOT/tools"

need() { command -v "$1" >/dev/null || { echo "missing dependency: $1" >&2; exit 1; }; }

require_cmake() {
  local major minor
  if ! command -v cmake >/dev/null; then
    echo "missing cmake (≥3.26). Install the Debian package, e.g. apt install cmake" >&2
    exit 1
  fi
  major=$(cmake --version | head -1 | sed -n 's/.* \([0-9]\+\)\.\([0-9]\+\).*/\1/p')
  minor=$(cmake --version | head -1 | sed -n 's/.* \([0-9]\+\)\.\([0-9]\+\).*/\2/p')
  if [[ "${major:-0}" -lt 3 || ( "${major:-0}" -eq 3 && "${minor:-0}" -lt 26 ) ]]; then
    echo "cmake $(cmake --version | head -1) is too old (need ≥3.26); install a newer Debian cmake" >&2
    exit 1
  fi
}

require_patchelf() {
  if ! command -v patchelf >/dev/null; then
    echo "missing patchelf. Install the Debian package, e.g. apt install patchelf" >&2
    exit 1
  fi
}

need curl
need tar
need ninja
need python3
need ar
need xz
need git
require_cmake
require_patchelf
# finagolfin get-packages uses `python` (Debian/F-Droid often only ship python3).
if ! command -v python >/dev/null && command -v python3 >/dev/null; then
  mkdir -p "$CACHE_ROOT/tools/bin"
  ln -sfn "$(command -v python3)" "$CACHE_ROOT/tools/bin/python"
  export PATH="$CACHE_ROOT/tools/bin:$PATH"
fi
need python

echo "using $(command -v cmake) ($(cmake --version | head -1))"
echo "using $(command -v patchelf)"

echo "==> Swift Android SDK from source (${SWIFT_TAG}, ${ANDROID_ARCH}, API ${ANDROID_API})"
mkdir -p "$CACHE_ROOT" "$WORK"

resolve_host_swift() {
  # Prefer a matching host Swift (Debian swiftlang on F-Droid, or a local
  # swiftly toolchain). Fall back to a Swift.org host tarball for local-dev.
  local swiftly_tc="${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/toolchains/${SWIFT_VER}/usr/bin"
  if [[ "$FORCE_HOST_TARBALL" != "1" && -x "$swiftly_tc/swift" ]]; then
    export PATH="$swiftly_tc:$PATH"
    TOOLCHAIN_BIN="$swiftly_tc"
    USE_SYSTEM_SWIFT=1
    echo "==> using swiftly Swift ${SWIFT_VER}: $($TOOLCHAIN_BIN/swift --version 2>/dev/null | head -1)"
    echo "    swift tools: $TOOLCHAIN_BIN"
    return 0
  fi
  if [[ "$FORCE_HOST_TARBALL" != "1" ]] && command -v swift >/dev/null; then
    local ver_line
    ver_line="$(swift --version 2>/dev/null | head -1 || true)"
    if [[ "$ver_line" == *"$SWIFT_VER"* ]]; then
      local swift_bin
      swift_bin="$(command -v swift)"
      TOOLCHAIN_BIN="$(cd "$(dirname "$swift_bin")" && pwd)"
      USE_SYSTEM_SWIFT=1
      echo "==> using system Swift: $ver_line"
      echo "    swift tools: $TOOLCHAIN_BIN"
      return 0
    fi
    echo "==> system Swift is not ${SWIFT_VER} ($ver_line); using host tarball"
  fi
  if [[ ! -x "$TOOLCHAIN_DIR/usr/bin/swift" ]]; then
    echo "==> host toolchain tarball → $TOOLCHAIN_DIR (local-dev fallback)"
    BRANCH="swift-${SWIFT_VER}-release"
    curl -fsSL -o "$CACHE_ROOT/swift-host.tar.gz" \
      "https://download.swift.org/${BRANCH}/${HOST_ID}/${SWIFT_TAG}/${SWIFT_TAG}-${HOST_NAME}.tar.gz"
    tar -xzf "$CACHE_ROOT/swift-host.tar.gz" -C "$CACHE_ROOT"
  fi
  export PATH="$TOOLCHAIN_DIR/usr/bin:$PATH"
  TOOLCHAIN_BIN="$TOOLCHAIN_DIR/usr/bin"
  echo "==> using tarball Swift (${HOST_NAME}): $($TOOLCHAIN_BIN/swift --version | head -1)"
}
resolve_host_swift
export PATH="$TOOLCHAIN_BIN:$PATH"
need swift
if ! swift --version >/dev/null 2>&1; then
  echo "host swift at $TOOLCHAIN_BIN/swift failed to run (glibc too old?)" >&2
  echo "hint: set SWIFT_HOST_ID=ubuntu2204 SWIFT_HOST_NAME=ubuntu22.04" >&2
  exit 1
fi
swift --version

# F-Droid sets ANDROID_NDK_HOME / ANDROID_NDK / NDK when the recipe has ndk:.
# Local: reuse an already-installed cache dir; never download from Google.
NDK_HOME="${ANDROID_NDK_HOME:-${ANDROID_NDK:-${NDK:-}}}"
if [[ -n "$NDK_HOME" ]]; then
  NDK_HOME="$(readlink -f "$NDK_HOME" 2>/dev/null || true)"
fi
if [[ -z "$NDK_HOME" || ! -d "$NDK_HOME/toolchains" ]]; then
  NDK_HOME="$CACHE_ROOT/android-ndk-${NDK_VERSION}"
fi
if [[ -L "$NDK_HOME" && ! -d "$NDK_HOME" ]]; then
  rm -f "$NDK_HOME"
fi
if [[ ! -d "$NDK_HOME/toolchains" ]]; then
  echo "missing Android NDK ${NDK_VERSION} at ${NDK_HOME}" >&2
  echo "hint: set ANDROID_NDK_HOME, or use F-Droid recipe ndk: ${NDK_VERSION}" >&2
  echo "      (do not curl dl.google.com — install via Android SDK / fdroidserver)" >&2
  exit 1
fi
export ANDROID_NDK_HOME="$NDK_HOME"
# build-script / finagolfin patches also look at ANDROID_NDK
export ANDROID_NDK="$NDK_HOME"
# Avoid driver bug when ANDROID_NDK_ROOT is set (see finagolfin README)
unset ANDROID_NDK_ROOT || true
echo "==> using NDK at $ANDROID_NDK_HOME"

# Debian clang cannot link the Android stdlib (ld.lld: unable to find -lgcc).
# Swift.org host tarballs ship a matching clang; with system swiftlang put
# NDK clang/lld next to Debian swift on PATH (build-script probes PATH for
# clang before --native-clang-tools-path is enough).
NATIVE_CLANG_TOOLS="$TOOLCHAIN_BIN"
if [[ "$USE_SYSTEM_SWIFT" == "1" ]]; then
  NDK_LLVM_BIN="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"
  [[ -x "$NDK_LLVM_BIN/clang" ]] \
    || { echo "missing NDK clang at $NDK_LLVM_BIN" >&2; exit 1; }
  # Resolve real binaries first — never ln -s then overwrite; that truncates
  # the NDK clang-18 through the symlink (seen: 135MB → 130B wrapper).
  NDK_CLANG="$(readlink -f "$NDK_LLVM_BIN/clang")"
  NDK_CLANGXX="$(readlink -f "$NDK_LLVM_BIN/clang++")"
  NDK_LLD="$(readlink -f "$NDK_LLVM_BIN/ld.lld")"
  HOST_BIN="$CACHE_ROOT/tools/host-bin"
  mkdir -p "$HOST_BIN"
  # Prefer real toolchain bins (not a version-manager shim like swiftly that
  # can resolve to a different Swift than SWIFT_VER when cwd changes).
  SWIFT_BIN="$(command -v swift)"
  SWIFT_C_BIN="$(command -v swiftc)"
  if [[ -x "${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/toolchains/${SWIFT_VER}/usr/bin/swift" ]]; then
    SWIFT_BIN="${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/toolchains/${SWIFT_VER}/usr/bin/swift"
    SWIFT_C_BIN="${SWIFTLY_HOME_DIR:-$HOME/.local/share/swiftly}/toolchains/${SWIFT_VER}/usr/bin/swiftc"
  else
    SWIFT_BIN="$(readlink -f "$SWIFT_BIN")"
    SWIFT_C_BIN="$(readlink -f "$SWIFT_C_BIN")"
  fi
  # Wrap swift/swiftc (don't bare-symlink): Arch may lack libncurses.so.6
  # while Debian F-Droid has it; keep ~/.local/lib on the loader path.
  for pair in "swift:$SWIFT_BIN" "swiftc:$SWIFT_C_BIN"; do
    name="${pair%%:*}"
    target="${pair#*:}"
    rm -f "$HOST_BIN/$name"
    {
      printf '%s\n' '#!/usr/bin/env bash'
      printf 'export LD_LIBRARY_PATH=%q${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}\n' \
        "$HOME/.local/lib"
      printf 'exec %q "$@"\n' "$target"
    } > "$HOST_BIN/$name"
    chmod +x "$HOST_BIN/$name"
  done
  # Wrappers so clang's resource-dir stays under the NDK tree (symlink of
  # clang into HOST_BIN makes it look for lib/clang next to HOST_BIN).
  for pair in "clang:$NDK_CLANG" "clang++:$NDK_CLANGXX" "ld.lld:$NDK_LLD"; do
    name="${pair%%:*}"
    target="${pair#*:}"
    rm -f "$HOST_BIN/$name"
    printf '#!/usr/bin/env bash\nexec %q "$@"\n' "$target" > "$HOST_BIN/$name"
    chmod +x "$HOST_BIN/$name"
  done
  for t in llvm-ar llvm-ranlib llvm-objcopy llvm-objdump; do
    if [[ -x "$NDK_LLVM_BIN/$t" ]]; then
      rm -f "$HOST_BIN/$t"
      ln -sfn "$(readlink -f "$NDK_LLVM_BIN/$t")" "$HOST_BIN/$t"
    fi
  done
  TOOLCHAIN_BIN="$HOST_BIN"
  NATIVE_CLANG_TOOLS="$HOST_BIN"
  export PATH="$HOST_BIN:$PATH"
  echo "==> host-bin: Debian/swiftly swift + NDK clang wrappers ($( "$HOST_BIN/clang" --version 2>/dev/null | sed -n '1p' ))"
fi

MARKER="$WORK/.sdk-built"
if [[ -f "$MARKER" && -d "$BUNDLE_OUT/swift-android" && "${SMSLOC_SWIFT_SDK_FORCE:-0}" != "1" ]]; then
  echo "==> reusing existing SDK bundle at $BUNDLE_OUT"
  # Refresh ndk-sysroot links if NDK moved / first use on this machine.
  if [[ ! -e "$BUNDLE_OUT/swift-android/ndk-sysroot/usr/lib/swift/android/${ANDROID_ARCH}/swiftrt.o" ]]; then
    export ANDROID_NDK_HOME
    ( cd "$BUNDLE_OUT/swift-android" && ./scripts/setup-android-sdk.sh )
  fi
  echo "$BUNDLE_OUT"
  exit 0
fi

echo "==> workdir $WORK"
cd "$WORK"
cp -a "$VENDOR/." "$WORK/vendor/"
# Sources + termux deps land in WORK
if [[ ! -d "$WORK/swift" ]]; then
  echo "==> fetch Termux build deps + Swift sources"
  # finagolfin's get-packages script shells out to `python` (not python3).
  if ! command -v python >/dev/null && command -v python3 >/dev/null; then
    mkdir -p "$CACHE_ROOT/tools/bin"
    ln -sfn "$(command -v python3)" "$CACHE_ROOT/tools/bin/python"
    export PATH="$CACHE_ROOT/tools/bin:$PATH"
  fi
  need python
  cp "$VENDOR/get-packages-and-swift-source.swift" "$WORK/"
  SWIFT_TAG="$SWIFT_TAG" ANDROID_ARCH="$ANDROID_ARCH" \
    "$TOOLCHAIN_BIN/swift" get-packages-and-swift-source.swift
fi

# Foundation's CMake always find_package(LibXml2 REQUIRED). Do not restore
# Termux libxml2 .deb — build static libxml2 from gnome source via
# build-script --static-libxml2 (matches swift update-checkout pin).
LIBXML2_TAG="${LIBXML2_TAG:-v2.11.5}"
# gnome/libxml2 v2.11.5 source tarball (github.com/gnome/libxml2 archive/refs/tags).
LIBXML2_SHA256="${LIBXML2_SHA256:-6c28059e2e3eeb42b5b4b16489e3916a6346c1095a74fee3bc65cdc5d89a6215}"
if [[ ! -d "$WORK/libxml2" ]]; then
  echo "==> fetch libxml2 ${LIBXML2_TAG} (Foundation static dep, not Termux)"
  need curl
  need tar
  need sha256sum
  (
    cd "$WORK"
    curl -fsSL -o "libxml2-${LIBXML2_TAG}.tar.gz" \
      "https://github.com/gnome/libxml2/archive/refs/tags/${LIBXML2_TAG}.tar.gz"
    echo "${LIBXML2_SHA256}  libxml2-${LIBXML2_TAG}.tar.gz" | sha256sum -c -
    tar xf "libxml2-${LIBXML2_TAG}.tar.gz"
    # gnome archives as libxml2-<tag without v> or libxml2-<full tag>
    if [[ -d "libxml2-${LIBXML2_TAG#v}" ]]; then
      mv "libxml2-${LIBXML2_TAG#v}" libxml2
    else
      mv "libxml2-${LIBXML2_TAG}" libxml2
    fi
    rm -f "libxml2-${LIBXML2_TAG}.tar.gz"
  )
fi

echo "==> apply Android patches"
# Patches are relative to the extracted source roots in WORK
apply_patch() {
  local p="$1"
  local fuzz="${2:-1}"
  if [[ -f "$WORK/.patched-$(basename "$p")" ]]; then
    return 0
  fi
  # Try from WORK (paths inside patches start with swift/, swift-testing/, …)
  if git apply -C"$fuzz" --directory="$WORK" "$p" 2>/dev/null \
    || (cd "$WORK" && git apply -C"$fuzz" "$p"); then
    touch "$WORK/.patched-$(basename "$p")"
    return 0
  fi
  echo "warning: patch failed (may already be applied): $p" >&2
  touch "$WORK/.patched-$(basename "$p")"
}

# Fresh extract has no git repo; use patch(1) / git apply --unsafe-paths
apply_patch_file() {
  local p="$1"
  local mark="$WORK/.patched-$(basename "$p")"
  [[ -f "$mark" ]] && return 0
  if (cd "$WORK" && patch -p1 --forward --batch < "$p"); then
    touch "$mark"
  elif (cd "$WORK" && patch -p1 --forward --batch --dry-run < "$p" >/dev/null 2>&1); then
    touch "$mark"
  else
    # Some hunks may already be upstream in 6.3.3 — continue
    echo "warning: could not fully apply $(basename "$p"); continuing" >&2
    touch "$mark"
  fi
}

# Patches from finagolfin/swift-android-sdk branch matching SWIFT_VER major.minor
# (6.2.x uses the 6.2 branch set; Foundation needs libandroid-spawn headers
# from native/libandroid-spawn, installed into the SDK sysroot below).
apply_patch_file "$VENDOR/swift-android.patch"
apply_patch_file "$VENDOR/swift-android-ci.patch"
if [[ -f "$VENDOR/swift-android-ci-except-trunk.patch" ]]; then
  apply_patch_file "$VENDOR/swift-android-ci-except-trunk.patch"
fi
if [[ -f "$VENDOR/swift-android-except-trunk.patch" ]]; then
  apply_patch_file "$VENDOR/swift-android-except-trunk.patch"
fi
if [[ -f "$VENDOR/swift-android-testing-release.patch" ]]; then
  apply_patch_file "$VENDOR/swift-android-testing-release.patch"
fi
# Legacy 6.3-oriented names (keep if present).
if [[ -f "$VENDOR/swift-android-ci-prebuilt.patch" ]]; then
  apply_patch_file "$VENDOR/swift-android-ci-prebuilt.patch"
fi
if [[ -f "$VENDOR/swift-android-ci-release.patch" ]]; then
  apply_patch_file "$VENDOR/swift-android-ci-release.patch"
fi

SDK_DIR_NAME="swift-release-android-${ANDROID_ARCH}-${ANDROID_API}-sdk"
# get-packages hardcodes -24-sdk for RELEASE tags
if [[ ! -d "$WORK/$SDK_DIR_NAME" ]]; then
  if [[ -d "$WORK/swift-release-android-${ANDROID_ARCH}-24-sdk" ]]; then
    SDK_DIR_NAME="swift-release-android-${ANDROID_ARCH}-24-sdk"
  fi
fi
SDK_PATH="$WORK/$SDK_DIR_NAME"
[[ -d "$SDK_PATH" ]] || { echo "missing cross-compile deps dir $SDK_PATH" >&2; exit 1; }

# Patch NDK execinfo.h API guard (finagolfin CI)
EXECINFO="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/include/execinfo.h"
if [[ -f "$EXECINFO" ]]; then
  perl -pi -e 's%33%24%' "$EXECINFO" || true
fi
if [[ -f "$SDK_PATH/usr/include/execinfo.h" ]]; then
  perl -pi -e 's%33%24%' "$SDK_PATH/usr/include/execinfo.h" || true
fi

# Termux .pc files still point at /data/data/com.termux/files/usr — rewrite so
# CMake does not treat that as the Android sysroot.
echo "==> rewrite Termux pkg-config prefixes → $SDK_PATH/usr"
find "$SDK_PATH/usr" -name '*.pc' -print0 2>/dev/null \
  | xargs -0 -r sed -i "s|/data/data/com.termux/files/usr|${SDK_PATH}/usr|g"

# Foundation needs posix_spawn headers/libs; build from vendored source
# (not packages.termux.dev).
echo "==> libandroid-spawn from source → $SDK_PATH/usr"
ANDROID_NDK_HOME="$ANDROID_NDK_HOME" \
  "$ROOT/scripts/build-libandroid-spawn.sh" "$SDK_PATH/usr"

# Drop Foundation/libxml2 cmake trees so LibXml2 / networking flags reconfigure.
# Full `rm -rf "$WORK/build"` only when SMSLOC_SWIFT_SDK_CLEAN_BUILD=1.
if [[ "${SMSLOC_SWIFT_SDK_CLEAN_BUILD:-0}" == "1" ]]; then
  rm -rf "$WORK/build"
else
  rm -rf \
    "$WORK/build/Ninja-Release/foundation-android-${ANDROID_ARCH}" \
    "$WORK/build/Ninja-Release/libxml2-android-${ANDROID_ARCH}" \
    "$WORK/build/Ninja-Release/libxml2-linux-x86_64"
fi

echo "==> build-script (Android ${ANDROID_ARCH}, this takes a long time)"
# Flags aligned with finagolfin/swift-android-sdk CI (sdks.yml), aarch64-only,
# without SwiftPM/llbuild (we only need stdlib + Dispatch + Foundation).
# --static-libxml2: compile gnome/libxml2 into the Android destdir (no Termux
#   libxml2 .deb). FOUNDATION_BUILD_NETWORKING=OFF: skip curl/openssl.
# foundation-cmake-options must be space-separated (not ';'): build-script-impl
# word-splits into cmake -D args. Do not put comments inside the \ continuation.
# ponytail: skip XCTest/Swift Testing (product JNI never links them; Testing
# needed Termux libandroid-execinfo for backtrace). --xctest used to pull in
# Foundation/Dispatch as deps — enable those explicitly instead.
# Dispatch/Foundation link with -sdk $NDK_sysroot and need swiftrt.o there after
# stdlib install; two phases + temporary NDK→destdir swift symlink.
# Upgrade: restore --xctest only with from-source execinfo if SDK self-tests return.
JOBS="${SMSLOC_SWIFT_SDK_JOBS:-$(nproc)}"
# Tools (plutil) fail to link on Android (ICU/libc++ shlib-undefined); we only
# need the Foundation libs for OfflineMapServer.
FOUNDATION_CMAKE_OPTS="-DCMAKE_SHARED_LINKER_FLAGS= -DFOUNDATION_BUILD_NETWORKING:BOOL=OFF -DFOUNDATION_BUILD_TOOLS:BOOL=OFF"
NDK_SYSROOT="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot"
cleanup_ndk_swift() {
  rm -rf "$NDK_SYSROOT/usr/lib/swift" "$NDK_SYSROOT/usr/lib/swift_static" || true
}
trap cleanup_ndk_swift EXIT

bs_common=(
  --skip-build-cmark
  --build-llvm=0
  --android
  --android-ndk "$ANDROID_NDK_HOME"
  --android-arch "$ANDROID_ARCH"
  --android-api-level "$ANDROID_API"
  --native-swift-tools-path="$TOOLCHAIN_BIN"
  --native-clang-tools-path="$NATIVE_CLANG_TOOLS"
  --cross-compile-hosts="android-${ANDROID_ARCH}"
  --cross-compile-deps-path="$SDK_PATH"
  --skip-local-build
  --build-swift-static-stdlib
  --install-destdir="$SDK_PATH"
  --swift-install-components='clang-resource-dir-symlink;license;stdlib;sdk-overlay'
  --cross-compile-append-host-target-to-destdir=False
  --cross-compile-build-swift-tools=False
  -j"$JOBS"
)

echo "==> build-script phase 1: Android stdlib (+ static libxml2)"
./swift/utils/build-script -RA \
  "${bs_common[@]}" \
  --static-libxml2 \
  --install-swift

echo "==> wire destdir swift into NDK sysroot for Dispatch/Foundation link"
mkdir -p "$NDK_SYSROOT/usr/lib"
ln -sfn "$SDK_PATH/usr/lib/swift" "$NDK_SYSROOT/usr/lib/swift"
if [[ -d "$SDK_PATH/usr/lib/swift_static" ]]; then
  ln -sfn "$SDK_PATH/usr/lib/swift_static" "$NDK_SYSROOT/usr/lib/swift_static"
fi

echo "==> build-script phase 2: Dispatch + Foundation (no XCTest)"
./swift/utils/build-script -RA \
  "${bs_common[@]}" \
  --libdispatch \
  --foundation \
  --install-libdispatch \
  --install-foundation \
  --foundation-cmake-options="$FOUNDATION_CMAKE_OPTS" \
  --libdispatch-cmake-options=-DCMAKE_SHARED_LINKER_FLAGS=''

cleanup_ndk_swift
trap - EXIT

echo "==> post-process runtime rpaths + libc++"
LIBCXX="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/lib/${ANDROID_ARCH}-linux-android/libc++_shared.so"
if [[ "$ANDROID_ARCH" == "armv7" ]]; then
  LIBCXX="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/lib/arm-linux-androideabi/libc++_shared.so"
fi
mkdir -p "$SDK_PATH/usr/lib"
cp -f "$LIBCXX" "$SDK_PATH/usr/lib/"
# Runtime libs may live under usr/lib/swift/android
if compgen -G "$SDK_PATH/usr/lib/swift/android/lib"*.so >/dev/null; then
  patchelf --set-rpath '$ORIGIN/../..:$ORIGIN' "$SDK_PATH"/usr/lib/swift/android/lib*.so || true
fi

echo "==> pack artifactbundle → $BUNDLE_OUT"
STAGE="$WORK/bundle-stage"
rm -rf "$STAGE"
BUNDLE_ROOT="$STAGE/$BUNDLE_NAME/swift-android"
mkdir -p "$BUNDLE_ROOT/swift-resources/usr/lib/swift" \
  "$BUNDLE_ROOT/swift-resources/usr/lib/swift-${ANDROID_ARCH}" \
  "$BUNDLE_ROOT/swift-resources/usr/lib/swift_static-${ANDROID_ARCH}" \
  "$BUNDLE_ROOT/scripts"

# Match official 6.3.3 layout:
#   swift-resources/usr/lib/swift-<arch>/   (swiftResourcesPath)
#   swift-resources/usr/lib/swift_static-<arch>/
#   swift-resources/usr/lib/swift/clang -> NDK clang (via setup-android-sdk.sh)
#   swift-<arch>/clang -> ../swift/clang
#   sdkRootPath = ndk-sysroot (created by setup-android-sdk.sh)
# Do NOT symlink into the real NDK sysroot — that breaks setup's swiftrt wiring.
RES_ARCH="$BUNDLE_ROOT/swift-resources/usr/lib/swift-${ANDROID_ARCH}"
RES_STATIC="$BUNDLE_ROOT/swift-resources/usr/lib/swift_static-${ANDROID_ARCH}"

if [[ -d "$SDK_PATH/usr/lib/swift" ]]; then
  cp -a "$SDK_PATH/usr/lib/swift/." "$RES_ARCH/"
else
  echo "could not find installed Android swift libs under $SDK_PATH" >&2
  find "$SDK_PATH/usr/lib" -name 'libswiftCore.so' 2>/dev/null | head
  exit 1
fi
if [[ -d "$SDK_PATH/usr/lib/swift_static" ]]; then
  cp -a "$SDK_PATH/usr/lib/swift_static/." "$RES_STATIC/"
elif [[ -f "$RES_ARCH/android/${ANDROID_ARCH}/swiftrt.o" ]]; then
  mkdir -p "$RES_STATIC/android/${ANDROID_ARCH}"
  cp -a "$RES_ARCH/android/${ANDROID_ARCH}/swiftrt.o" \
    "$RES_STATIC/android/${ANDROID_ARCH}/"
fi
ln -sfn ../swift/clang "$RES_ARCH/clang"
# Spawn .so is built from native/libandroid-spawn during package-android-jni /
# build-libandroid-spawn — do not ship Termux's prebuilt .a in the bundle.
if [[ -d "$BUNDLE_ROOT/termux-libs" ]]; then
  rm -f "$BUNDLE_ROOT/termux-libs/libandroid-spawn.a"
  rmdir "$BUNDLE_ROOT/termux-libs" 2>/dev/null || true
fi

[[ -d "$RES_ARCH/shims" ]] || { echo "missing SwiftShims (shims/) in packed SDK" >&2; exit 1; }
[[ -f "$RES_ARCH/android/libswiftCore.so" || -f "$RES_ARCH/android/${ANDROID_ARCH}/libswiftCore.so" ]] \
  || { echo "missing libswiftCore.so in packed SDK" >&2; ls -la "$RES_ARCH/android" | head; exit 1; }
[[ -f "$RES_ARCH/android/${ANDROID_ARCH}/swiftrt.o" ]] \
  || { echo "missing swiftrt.o in packed SDK" >&2; exit 1; }

# Official setup script (vendored copy, or extract from published bundle notes).
SETUP_SRC="$VENDOR/setup-android-sdk.sh"
if [[ ! -f "$SETUP_SRC" ]]; then
  SETUP_SRC="$CACHE_ROOT/official-scripts/swift-6.3.3-RELEASE_android.artifactbundle/swift-android/scripts/setup-android-sdk.sh"
fi
if [[ -f "$SETUP_SRC" ]]; then
  cp -f "$SETUP_SRC" "$BUNDLE_ROOT/scripts/setup-android-sdk.sh"
else
  # Minimal fallback matching swift-android-sdk 6.3.3 setup-android-sdk.sh
  cat > "$BUNDLE_ROOT/scripts/setup-android-sdk.sh" <<'SETUP'
#!/usr/bin/env bash
set -e
if [ -z "${ANDROID_NDK_HOME}" ]; then
  echo "$(basename "$0"): error: missing environment variable ANDROID_NDK_HOME"
  exit 1
fi
ndk_prebuilt="${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt"
if [ ! -d "${ndk_prebuilt}" ]; then
  echo "$(basename "$0"): error: ANDROID_NDK_HOME not found: ${ndk_prebuilt}"
  exit 1
fi
cd "$(dirname "$(dirname "$(realpath -- "${BASH_SOURCE[0]}")")")"
swift_resources=swift-resources
ndk_sysroot=ndk-sysroot
rm -rf "${ndk_sysroot}"
mkdir -p "${ndk_sysroot}/usr/lib"
ln -s ${ndk_prebuilt}/*/sysroot/usr/include "${ndk_sysroot}/usr/include"
for triplePath in ${ndk_prebuilt}/*/sysroot/usr/lib/*; do
  triple=$(basename "${triplePath}")
  ln -s "${triplePath}" "${ndk_sysroot}/usr/lib/${triple}"
done
ln -sf ${ndk_prebuilt}/*/lib/clang/* "${swift_resources}/usr/lib/swift/clang"
for folder in swift swift_static; do
  for swiftrt in ${swift_resources}/usr/lib/${folder}-*/android/*/swiftrt.o; do
    [[ -e "$swiftrt" ]] || continue
    arch=$(basename "$(dirname "${swiftrt}")")
    mkdir -p "${ndk_sysroot}/usr/lib/${folder}/android/${arch}"
    ln -s "../../../../../../${swiftrt}" \
      "${ndk_sysroot}/usr/lib/${folder}/android/${arch}/"
  done
done
echo "$(basename "$0"): success: ndk-sysroot linked to Android NDK at ${ndk_prebuilt}"
SETUP
fi
chmod +x "$BUNDLE_ROOT/scripts/setup-android-sdk.sh"

cat > "$STAGE/$BUNDLE_NAME/info.json" <<EOF
{
  "schemaVersion": "1.0",
  "artifacts": {
    "${SWIFT_TAG}_android": {
      "variants": [ { "path": "swift-android" } ],
      "version": "0.1",
      "type": "swiftSDK"
    }
  }
}
EOF

{
  echo '{'
  echo '  "schemaVersion": "4.0",'
  echo '  "targetTriples": {'
  for api in $(seq 24 35); do
    comma=","
    [[ "$api" -eq 35 ]] && comma=""
    cat <<TRIPLE
    "${ANDROID_ARCH}-unknown-linux-android${api}": {
      "sdkRootPath": "ndk-sysroot",
      "swiftResourcesPath": "swift-resources/usr/lib/swift-${ANDROID_ARCH}",
      "swiftStaticResourcesPath": "swift-resources/usr/lib/swift_static-${ANDROID_ARCH}",
      "toolsetPaths": ["swift-toolset.json"]
    }${comma}
TRIPLE
  done
  echo '  }'
  echo '}'
} > "$BUNDLE_ROOT/swift-sdk.json"

cat > "$BUNDLE_ROOT/swift-toolset.json" <<EOF
{
  "schemaVersion": "1.0",
  "cCompiler": { "extraCLIOptions": ["-fPIC"] },
  "swiftCompiler": { "extraCLIOptions": ["-Xclang-linker", "-fuse-ld=lld"] },
  "linker": { "extraCLIOptions": ["-z", "max-page-size=16384"] }
}
EOF

# Wire ndk-sysroot now so the bundle is usable without a separate step.
export ANDROID_NDK_HOME
# Never leave a stale swift symlink inside the real NDK sysroot.
rm -rf "$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/lib/swift" \
  "$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/sysroot/usr/lib/swift_static" || true
( cd "$BUNDLE_ROOT" && ./scripts/setup-android-sdk.sh )

rm -rf "$BUNDLE_OUT"
mkdir -p "$(dirname "$BUNDLE_OUT")"
cp -a "$STAGE/$BUNDLE_NAME" "$BUNDLE_OUT"

tar -C "$STAGE" -czf "${BUNDLE_OUT}.tar.gz" "$BUNDLE_NAME"

touch "$MARKER"
echo "==> built $BUNDLE_OUT"
echo "==> tarball ${BUNDLE_OUT}.tar.gz"

if [[ "$KEEP_WORK" != "1" ]]; then
  echo "==> cleaning bulky source/build trees (keep SDK deps + marker)"
  rm -rf "$WORK/build" "$WORK/llvm-project" \
    "$WORK/swift-syntax" "$WORK/swift-foundation" "$WORK/swift-foundation-icu" \
    "$WORK/swift-collections" "$WORK/swift-experimental-string-processing" \
    "$WORK/swift-corelibs-libdispatch" "$WORK/swift-corelibs-foundation" \
    "$WORK/swift-corelibs-xctest" "$WORK/swift-testing" \
    "$WORK/bundle-stage" || true
  # Keep swift/ for patch re-apply debugging unless space is tight
  if [[ "${SMSLOC_SWIFT_SDK_DROP_SWIFT_SRC:-1}" == "1" ]]; then
    rm -rf "$WORK/swift"
  fi
fi

echo "$BUNDLE_OUT"
