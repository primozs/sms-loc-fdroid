# Swift Android SDK (from-source) assets

Vendored helpers/patches from
[finagolfin/swift-android-sdk](https://github.com/finagolfin/swift-android-sdk)
**`6.2` branch** (matches Debian `swiftlang` 6.2.3 / `SWIFT_VER=6.2.3`) used by
[`scripts/build-swift-android-sdk.sh`](../../../scripts/build-swift-android-sdk.sh).

| File | Role |
|------|------|
| `get-packages-and-swift-source.swift` | Fetch Termux build deps + Swift source tarballs |
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

Termux `.deb` packages are **build-time** sysroot deps for Foundation (spawn /
execinfo / optional curl+xml). SMSLoc’s APK packaging only copies transitive
`NEEDED` libs of `OfflineMapServerCore` (no FoundationNetworking/XML).
