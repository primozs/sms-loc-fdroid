# Swift Android SDK (from-source) assets

Vendored helpers/patches from
[finagolfin/swift-android-sdk](https://github.com/finagolfin/swift-android-sdk)
**`6.2` branch** (matches Debian `swiftlang` 6.2.3 / `SWIFT_VER=6.2.3`) used by
[`scripts/build-swift-android-sdk.sh`](../../../scripts/build-swift-android-sdk.sh).

| File | Role |
|------|------|
| `get-packages-and-swift-source.swift` | Fetch Swift source tarballs (+ optional Termux debs if `BUILD_SWIFT_PM`) |
| `swift-android.patch` | Foundation↔`libandroid-spawn`, driver / Testing fixes |
| `swift-android-ci*.patch` | CI-oriented build-script tweaks (release pin) |
| `swift-android-except-trunk.patch` | RELEASE autolink `android-spawn` |
| `swift-android-testing-release.patch` | Testing overlay for RELEASE |
| `libc++-stdlib.h.patch` | libc++ header workaround for the packaged SDK |
| `setup-android-sdk.sh` | Official-layout `ndk-sysroot` + clang resource wiring |

**Provenance:** Apache-2.0 (see upstream LICENSE). We rebuild the Android
stdlib / Dispatch / Foundation for **aarch64** from `swift-*-RELEASE` sources;
the host Swift compiler and NDK remain build tools (Debian `swiftlang` on
F-Droid; Swift.org tarball fallback for local-dev).

SMSLoc’s default path fetches **no** Termux `.deb` packages (empty
`termuxPackages` + empty sysroot skeleton). curl / openssl / xml stacks are
not downloaded from `packages.termux.dev`. Foundation still needs LibXml2 at
compile time — `build-swift-android-sdk.sh` fetches `gnome/libxml2` and builds
it with `--static-libxml2`. Networking stays off
(`FOUNDATION_BUILD_NETWORKING=OFF`). XCTest / Swift Testing are not built
(no `libandroid-execinfo`). `libandroid-spawn` is compiled from vendored
source under `native/libandroid-spawn/` (see
`scripts/build-libandroid-spawn.sh`). APK packaging only copies transitive
`NEEDED` libs of `OfflineMapServerCore`.
