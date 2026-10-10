# F-Droid-shaped local build + phone gate

How to build and install an APK that matches the **F-Droid recipe path**
(from-source Swift Android SDK + from-source `libandroid-spawn`), and what to
check on a phone before tagging / pushing Inclusion fixes.

Official Inclusion / recipe notes: [`docs/fdroid.md`](fdroid.md).  
OfflineMapServer packaging overview: [`native/OfflineMapServer/README.md`](../native/OfflineMapServer/README.md).

## Why this doc exists

Day-to-day UI work can still use the official Swift Android SDK from
`download.swift.org`. **F-Droid never does.** It rebuilds stdlib / Dispatch /
Foundation via `scripts/build-swift-android-sdk.sh` and compiles
`libandroid-spawn` from `native/libandroid-spawn/`.

If you only test with the official prebuilt SDK, the app can work in “dev”
and fail (or behave differently) in the F-Droid / Inclusion build. Use this
doc whenever you need the shipping-shaped natives.

| Path | Swift Android runtime | `libandroid-spawn` | Use for |
|------|----------------------|--------------------|---------|
| **F-Droid / this doc** | From-source artifactbundle under `~/.cache/smsloc-fdroid-swift/` | `scripts/build-libandroid-spawn.sh` | Inclusion, Task 7 phone, release confidence |
| **Local fast path** | Official `…_android.artifactbundle` from download.swift.org | Still from-source (packaging always builds it) | Quick UI / Capacitor iteration only |

Vue/Ionic, config, and SMS paths are the same either way. The gap is the
native `.so` set in `jniLibs`.

## Prerequisites

1. Yarn Classic + Node matching `package.json`
2. Android SDK (see `android/variables.gradle`)
3. NDK **r27d** (or SDK package `27.2.12479018`) on `ANDROID_NDK_HOME` — scripts
   do **not** curl `dl.google.com`
4. Host Swift **6.2.3** (Debian `swiftlang` / swiftly, or Swift.org tarball
   fallback for local only)
5. System tools: `cmake` ≥3.26, `patchelf`, `ninja-build`, `git`, `perl`, `patch`,
   `curl`, `clang` wrappers as needed

```sh
export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-$HOME/opt/Android/Sdk/ndk/27.2.12479018}"
# Optional: pin the from-source bundle once it exists
export SMSLOC_SWIFT_SDK_BUNDLE="${SMSLOC_SWIFT_SDK_BUNDLE:-$HOME/.cache/smsloc-fdroid-swift/swift-6.2.3-RELEASE-android-24-0.1.artifactbundle}"
```

## Full rebuild (mirrors F-Droid `prebuild:`)

Same entry as the recipe (`docs/fdroid/metadata/si.stenar.smsloc.yml` →
`prebuild:` → `./scripts/fdroid-prebuild.sh`):

```sh
./scripts/fdroid-build.sh
# or: yarn fdroid-build
```

This runs:

1. `scripts/build-swift-android-sdk.sh` — from-source aarch64 SDK (~long first time)
2. `swift sdk install` of that local bundle (not download.swift.org)
3. `yarn install`, `configure:prod`, `package-android-jni.sh`, `ionic-sync`
4. `gradlew assembleRelease` → unsigned APK under
   `android/app/build/outputs/apk/release/`

F-Droid signs with its own key. For a phone install you may need a debug/
sideload-signed APK instead (below).

After `fdroid-build`, `src/config.ts` comes from `config/prod/index.ts`. Keep
that file aligned with `config/prod/index.example.ts` (especially
`OFFLINE_MAP_DOWNLOAD_URL` / `SERVER_PORT` / `LOCAL_MAPS_STYLE`). A stale
gitignored `prod/index.ts` yields native `url required` on offline map
download. For day-to-day device runs you can instead `yarn configure:dev -y`
before `ionic-sync`.

## Fast path when the from-source SDK already exists

If
`$HOME/.cache/smsloc-fdroid-swift/swift-6.2.3-RELEASE-android-24-0.1.artifactbundle`
is already built:

```sh
export ANDROID_NDK_HOME=…   # as above
export SMSLOC_SWIFT_SDK_BUNDLE="$HOME/.cache/smsloc-fdroid-swift/swift-6.2.3-RELEASE-android-24-0.1.artifactbundle"

swift sdk install "$SMSLOC_SWIFT_SDK_BUNDLE"   # once per machine; OK if it says already installed / included
./native/OfflineMapServer/scripts/package-android-jni.sh
yarn ionic-sync
yarn ionic-capacitor-run-android
# or: open android/ in Android Studio and Run (debug signing)
```

`package-android-jni.sh` always builds `libandroid-spawn.so` from
`native/libandroid-spawn/` (16KB pages). Log line should say:

```text
+ libandroid-spawn.so (from-source 16KB)
```

Optional check:

```sh
readelf -d android/app/src/main/jniLibs/arm64-v8a/libandroid-spawn.so | grep SONAME
# SONAME → libandroid-spawn.so
```

## Phone checklist (Inclusion / Task 7)

Do this on a real device before asking to commit/push Inclusion work.
Criteria also live in `tasks/todo.md` (Task 7) and
`SPEC-termux-from-source.md`.

1. **Cold start** — force-stop, reopen. No crash / “library failed to load”.
2. **Contacts + Settings** — both open.
3. **Contact persist** — add/edit a whitelist contact → force-stop → reopen → still there.
4. **Offline map**
   - With pack installed: Map tab shows tiles (local server on loopback).
   - Without pack: no `dlopen` crash for `libandroid-spawn`; blank map /
     “download pack” is OK.

Before commit:

```sh
yarn type-check
yarn lint
```

## What still differs from the F-Droid server

- **Signing:** local debug/release keystore ≠ F-Droid key (cannot update across).
- **Host Swift:** F-Droid uses Debian `forky` `swiftlang`; local may use swiftly /
  Swift.org tarball — target Android `.so`s must still come from our from-source
  SDK script for parity.
- **GHCR Docker SDK image:** optional local/CI cache only; recipe must not pull it
  (see `docs/fdroid.md`).

## Related scripts

| Script | Role |
|--------|------|
| `scripts/fdroid-prebuild.sh` | Recipe + local full prebuild |
| `scripts/fdroid-build.sh` | Prebuild + unsigned `assembleRelease` |
| `scripts/build-swift-android-sdk.sh` | From-source Swift Android SDK |
| `scripts/build-libandroid-spawn.sh` | From-source spawn `.so` / `.a` / `spawn.h` |
| `native/OfflineMapServer/scripts/package-android-jni.sh` | Fill gitignored `jniLibs` |
| `scripts/check-termux-packages.sh` | Assert zero default Termux debs (+ no spawn/curl/xml) |
| `scripts/check-host-tooling.sh` | NDK/cmake/patchelf fail-closed checks |
