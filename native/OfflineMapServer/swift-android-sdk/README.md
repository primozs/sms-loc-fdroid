# Swift Android SDK (from-source) assets

Vendored helpers/patches from
[finagolfin/swift-android-sdk](https://github.com/finagolfin/swift-android-sdk)
(upstream `main`, fetched 2026-08-09) used by
[`scripts/build-swift-android-sdk.sh`](../../../scripts/build-swift-android-sdk.sh).

| File | Role |
|------|------|
| `get-packages-and-swift-source.swift` | Fetch Termux build deps + Swift source tarballs |
| `swift-android.patch` | Driver / Testing Android fixes for `build-script` |
| `swift-android-ci*.patch` | CI-oriented build-script tweaks (release pin) |
| `libc++-stdlib.h.patch` | libc++ header workaround for the packaged SDK |
| `setup-android-sdk.sh` | Official-layout `ndk-sysroot` + clang resource wiring (from `swift-*-RELEASE_android.artifactbundle`) |

**Provenance:** Apache-2.0 (see upstream LICENSE). We rebuild the Android
stdlib / Dispatch / Foundation for **aarch64** from `swift-*-RELEASE` sources;
the host Swift compiler and NDK remain downloaded build tools.

Termux `.deb` packages are **build-time** sysroot deps for Foundation (spawn /
execinfo / optional curl+xml). SMSLoc’s APK packaging only copies transitive
`NEEDED` libs of `OfflineMapServerCore` (no FoundationNetworking/XML).
