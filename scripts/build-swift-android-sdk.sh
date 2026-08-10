#!/usr/bin/env bash
# Rebuild the Swift Android SDK (stdlib + Dispatch + Foundation) from source.
#
# Used by:
#   - scripts/fdroid-prebuild.sh  (F-Droid: always from source)
#   - deploy/docker/swift-android-sdk/Dockerfile  (published cache for local/CI)
#
# Host Swift: prefer Debian/system `swiftlang` (F-Droid). Fall back to a
# Swift.org host tarball for local-dev only. NDK remains a download. Target
# Android libs are compiled here. Based on finagolfin/swift-android-sdk.
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

# Prefer a Kitware CMake ≥3.26 if we installed one under the cache (Ubuntu
# 22.04 / Debian bookworm ship older; libdispatch for Swift 6.3 needs ≥3.26).
export PATH="${HOME}/.local/bin:/usr/local/bin:$PATH"
mkdir -p "$CACHE_ROOT/tools"

ensure_cmake() {
  local major minor
  if command -v cmake >/dev/null; then
    major=$(cmake --version | head -1 | sed -n 's/.* \([0-9]\+\)\.\([0-9]\+\).*/\1/p')
    minor=$(cmake --version | head -1 | sed -n 's/.* \([0-9]\+\)\.\([0-9]\+\).*/\2/p')
    if [[ "${major:-0}" -gt 3 || ( "${major:-0}" -eq 3 && "${minor:-0}" -ge 26 ) ]]; then
      return 0
    fi
  fi
  local ver="3.30.5"
  local prefix="$CACHE_ROOT/tools/cmake-${ver}-linux-x86_64"
  if [[ ! -x "$prefix/bin/cmake" ]]; then
    echo "==> fetch Kitware CMake ${ver} (need ≥3.26)"
    curl -fsSL -o "$CACHE_ROOT/tools/cmake.tgz" \
      "https://github.com/Kitware/CMake/releases/download/v${ver}/cmake-${ver}-linux-x86_64.tar.gz"
    tar -xzf "$CACHE_ROOT/tools/cmake.tgz" -C "$CACHE_ROOT/tools"
  fi
  export PATH="$prefix/bin:$PATH"
}

ensure_patchelf() {
  if command -v patchelf >/dev/null; then
    return 0
  fi
  local ver="0.18.0"
  local bin="$CACHE_ROOT/tools/patchelf-${ver}"
  if [[ ! -x "$bin" ]]; then
    echo "==> fetch patchelf ${ver}"
    curl -fsSL -o "$CACHE_ROOT/tools/patchelf.tgz" \
      "https://github.com/NixOS/patchelf/releases/download/${ver}/patchelf-${ver}-x86_64.tar.gz"
    tar -xzf "$CACHE_ROOT/tools/patchelf.tgz" -C "$CACHE_ROOT/tools"
    # tarball layout: bin/patchelf
    if [[ -x "$CACHE_ROOT/tools/bin/patchelf" ]]; then
      mv "$CACHE_ROOT/tools/bin/patchelf" "$bin"
    elif [[ -x "$CACHE_ROOT/tools/patchelf-${ver}-x86_64/bin/patchelf" ]]; then
      mv "$CACHE_ROOT/tools/patchelf-${ver}-x86_64/bin/patchelf" "$bin"
    fi
  fi
  [[ -x "$bin" ]] || { echo "failed to install patchelf" >&2; exit 1; }
  mkdir -p "$HOME/.local/bin"
  ln -sfn "$bin" "$HOME/.local/bin/patchelf"
  export PATH="$HOME/.local/bin:$PATH"
}

CMAKE_KITWARE="${SMSLOC_CMAKE_BIN:-}"
if [[ -z "$CMAKE_KITWARE" ]]; then
  shopt -s nullglob
  for c in "$CACHE_ROOT"/tools/cmake-*-linux-x86_64/bin/cmake; do
    if [[ -x "$c" ]]; then CMAKE_KITWARE="$c"; break; fi
  done
  shopt -u nullglob
fi
if [[ -n "$CMAKE_KITWARE" ]]; then
  export PATH="$(dirname "$CMAKE_KITWARE"):${PATH}"
fi

need() { command -v "$1" >/dev/null || { echo "missing dependency: $1" >&2; exit 1; }; }
need curl
need tar
need ninja
need python3
need ar
need xz
need git
ensure_cmake
ensure_patchelf
# finagolfin get-packages uses `python` (Debian/F-Droid often only ship python3).
if ! command -v python >/dev/null && command -v python3 >/dev/null; then
  mkdir -p "$CACHE_ROOT/tools/bin"
  ln -sfn "$(command -v python3)" "$CACHE_ROOT/tools/bin/python"
  export PATH="$CACHE_ROOT/tools/bin:$PATH"
fi
need cmake
need patchelf
need python

echo "using $(command -v cmake) ($(cmake --version | head -1))"
echo "using $(command -v patchelf)"

echo "==> Swift Android SDK from source (${SWIFT_TAG}, ${ANDROID_ARCH}, API ${ANDROID_API})"
mkdir -p "$CACHE_ROOT" "$WORK"

resolve_host_swift() {
  # Prefer Debian/system swiftlang when its version matches SWIFT_VER (F-Droid).
  if [[ "$FORCE_HOST_TARBALL" != "1" ]] && command -v swift >/dev/null; then
    local ver_line
    ver_line="$(swift --version 2>/dev/null | head -1 || true)"
    if [[ "$ver_line" == *"$SWIFT_VER"* ]]; then
      local swift_bin clang_bin
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

NDK_HOME="${ANDROID_NDK_HOME:-}"
# Resolve symlinks; a dangling link (e.g. after removing an old SDK) is not a dir.
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
  echo "==> NDK ${NDK_VERSION} → $NDK_HOME"
  curl -fSL -o "$CACHE_ROOT/ndk.zip" \
    "https://dl.google.com/android/repository/android-ndk-${NDK_VERSION}-linux.zip"
  unzip -qo "$CACHE_ROOT/ndk.zip" -d "$CACHE_ROOT"
  NDK_HOME="$CACHE_ROOT/android-ndk-${NDK_VERSION}"
fi
export ANDROID_NDK_HOME="$NDK_HOME"
# build-script / finagolfin patches also look at ANDROID_NDK
export ANDROID_NDK="$NDK_HOME"
# Avoid driver bug when ANDROID_NDK_ROOT is set (see finagolfin README)
unset ANDROID_NDK_ROOT || true

# Debian clang cannot link the Android stdlib (ld.lld: unable to find -lgcc).
# Swift.org host tarballs ship a matching clang; with system swiftlang use the
# NDK clang/lld already downloaded as a build tool (same as local spike).
NATIVE_CLANG_TOOLS="$TOOLCHAIN_BIN"
if [[ "$USE_SYSTEM_SWIFT" == "1" ]]; then
  NATIVE_CLANG_TOOLS="$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin"
  [[ -x "$NATIVE_CLANG_TOOLS/clang" ]] \
    || { echo "missing NDK clang at $NATIVE_CLANG_TOOLS" >&2; exit 1; }
  echo "==> native clang tools: NDK ($( "$NATIVE_CLANG_TOOLS/clang" --version 2>/dev/null | sed -n '1p' ))"
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
# (6.2.x uses the 6.2 branch set; Foundation needs termux libandroid-spawn headers).
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

# Drop a failed/partial cmake tree so configure is clean.
rm -rf "$WORK/build"

echo "==> build-script (Android ${ANDROID_ARCH}, this takes a long time)"
# Flags aligned with finagolfin/swift-android-sdk CI (sdks.yml), aarch64-only,
# without SwiftPM/llbuild (we only need stdlib + Dispatch + Foundation).
JOBS="${SMSLOC_SWIFT_SDK_JOBS:-$(nproc)}"
./swift/utils/build-script -RA \
  --skip-build-cmark \
  --build-llvm=0 \
  --android \
  --android-ndk "$ANDROID_NDK_HOME" \
  --android-arch "$ANDROID_ARCH" \
  --android-api-level "$ANDROID_API" \
  --native-swift-tools-path="$TOOLCHAIN_BIN" \
  --native-clang-tools-path="$NATIVE_CLANG_TOOLS" \
  --cross-compile-hosts="android-${ANDROID_ARCH}" \
  --cross-compile-deps-path="$SDK_PATH" \
  --skip-local-build \
  --build-swift-static-stdlib \
  --xctest \
  --install-swift \
  --install-libdispatch \
  --install-foundation \
  --install-xctest \
  --install-destdir="$SDK_PATH" \
  --swift-install-components='clang-resource-dir-symlink;license;stdlib;sdk-overlay' \
  --cross-compile-append-host-target-to-destdir=False \
  --cross-compile-build-swift-tools=False \
  --foundation-cmake-options=-DCMAKE_SHARED_LINKER_FLAGS='' \
  --libdispatch-cmake-options=-DCMAKE_SHARED_LINKER_FLAGS='' \
  -j"$JOBS"

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
# Termux libandroid-spawn.a for 16KB relink during OfflineMapServer packaging.
if [[ -f "$SDK_PATH/usr/lib/libandroid-spawn.a" ]]; then
  mkdir -p "$BUNDLE_ROOT/termux-libs"
  cp -f "$SDK_PATH/usr/lib/libandroid-spawn.a" "$BUNDLE_ROOT/termux-libs/"
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
