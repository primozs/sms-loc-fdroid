# F-Droid build notes

SMSLoc (`si.stenar.smsloc`) is submitted to the official F-Droid repository via
[fdroiddata](https://gitlab.com/fdroid/fdroiddata). F-Droid builds and signs the
APK from a git tag; do **not** use `yarn docker:compile` / your release keystore
for the F-Droid package (different signing key → users cannot update across
channels without uninstall).

Draft metadata for the fdroiddata MR lives at
[`docs/fdroid/metadata/si.stenar.smsloc.yml`](fdroid/metadata/si.stenar.smsloc.yml).

## License

`GPL-3.0-or-later` — see [`LICENSE`](../LICENSE) and the README notice.

## Store metadata (upstream)

Fastlane layout under `fastlane/metadata/android/{en-US,sl-SI}/` (descriptions,
icon, screenshots, changelogs). F-Droid pulls these from the tagged source.

## Unsigned local build (mirrors the recipe)

Maintainer runbook (from-source SDK vs official prebuilt, phone checklist):
[`docs/fdroid-local-build.md`](fdroid-local-build.md).

Prerequisites on the host:

1. Node.js + Yarn (Classic) matching `package.json` / `yarn.lock`
2. Android SDK (this repo: compile/target SDK from `android/variables.gradle`)
3. Host Swift **6.2.3** (Debian `swiftlang`, or a local Swift.org tarball
   fallback), NDK **r27d** on `ANDROID_NDK_HOME` (or already under
   `$HOME/.cache/smsloc-fdroid-swift/android-ndk-r27d`), and network for Swift
   sources (first run). System packages: `cmake` (≥3.26), `patchelf`,
   `ninja-build`, `git`, `perl`, `patch`. Scripts fail if cmake/patchelf/NDK
   are missing — they do not curl Google/Kitware/NixOS tarballs.

Then:

```sh
./scripts/fdroid-build.sh
# or: yarn fdroid-build
```

Pipeline:

1. `./scripts/fdroid-prebuild.sh`
   - `scripts/build-swift-android-sdk.sh` — rebuild Android stdlib / Dispatch /
     Foundation (**from source**, aarch64) into an artifactbundle under
     `$HOME/.cache/smsloc-fdroid-swift` (~25–40 min first time)
   - `swift sdk install` that local bundle (not the download.swift.org prebuilt)
   - `yarn install`, `configure:prod`, `package-android-jni.sh`, `ionic-sync`
   - drop SPM `.build` and unused jar/wasm/tar.gz blobs (keep
     `node_modules/*/android` for Gradle)
2. `cd android && ./gradlew assembleRelease` — **unsigned** APK under
   `android/app/build/outputs/apk/release/`

The fdroiddata recipe calls the same `fdroid-prebuild.sh` from `prebuild`.
Set `timeout` high enough for the SDK rebuild (draft metadata uses 14400 s).

### Fast path for developers (not F-Droid)

A Docker image that runs the same from-source SDK build can be published to
GHCR for local/CI reuse (see
[`deploy/docker/swift-android-sdk/Dockerfile`](../deploy/docker/swift-android-sdk/Dockerfile)
and `.github/workflows/swift-android-sdk.yml`). **F-Droid must not pull this
image** — reviewers expect the recipe to compile target libs from source.

## Release tags

For each release shipped to F-Droid:

1. Align `package.json` `version` with `android/app/build.gradle` `versionName`
2. Bump `versionCode` (monotonic integer)
3. Add `fastlane/metadata/android/*/changelogs/<versionCode>.txt`
4. Commit, tag `v<versionName>` (e.g. `v0.0.12`), push tag

Autoupdate in metadata uses `UpdateCheckMode: Tags`.

## AntiFeatures

`NonFreeNet` (declared in metadata):

- Optional online map styles from `maptiles.stenar.si`
- Optional offline map pack download from GitHub (`github.com/primozs/small-planet`)
- Core SMS location sharing works without either (no `TetheredNet`)

Draft text lives in [`docs/fdroid/metadata/si.stenar.smsloc.yml`](fdroid/metadata/si.stenar.smsloc.yml).

## MR reply draft (NonFreeNet blocker)

For [fdroiddata!45187](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/45187) after updating metadata:

> Added `NonFreeNet` naming maptiles.stenar.si (optional online styles) and GitHub-hosted optional offline map pack. Core SMS location sharing does not use either. We removed `TetheredNet` earlier because the app is not broken offline for its primary function. Fork CI re-run: [pipeline link].

## Scanner notes

F-Droid runs scandelete **after** `prebuild:` and **before** `build:` /
Gradle. The recipe therefore runs `./scripts/fdroid-prebuild.sh` in
`prebuild:` (not only under `build:`) so yarn install, the Swift SDK fetch,
and JNI outputs are visible to the scanner — intentional, not evasion.

- Do not commit `google-services.json` or `jniLibs/**/*.so`
- GMS plugin is only applied if that JSON exists (keep it absent)
- Prebuild installs Swift under `$HOME` (not the VCS tree), removes SPM
  `.build`, and strips unused jar/wasm/tar.gz under `node_modules`
  (including `@capacitor/cli/assets/*.tar.gz` after `ionic-sync`)
- Keep Capacitor plugin android sources in `node_modules` for Gradle
- `jniLibs` are produced in prebuild from **from-source** builds
  (OfflineMapServer + Swift Android runtime + `native/libandroid-spawn`);
  recipe uses `scanignore: android/app/src/main/jniLibs` for those outputs
  only (not Termux binary blobs)
- Termux: no `.deb` fetches for the default SMSLoc SDK path (empty sysroot;
  spawn from vendored source; libxml2 via `--static-libxml2`; XCTest/Testing
  skipped so `libandroid-execinfo` is not needed)

## MR reply draft (sqlcipher / biometric)

For Inclusion’s note on `libsqlcipher.so` + `USE_BIOMETRIC` /
`USE_FINGERPRINT` via `@capacitor-community/sqlite`:

> Thanks for flagging this. The app opens the DB unencrypted
> (`encrypted = false` / `no-encryption`); we do not use biometric unlock or
> SQLCipher encryption at runtime.
>
> `@capacitor-community/sqlite` is the standard Capacitor SQLite plugin. Its
> Android code always links `net.zetetic:sqlcipher-android` (FLOSS, Maven
> Central) and compiles against `androidx.biometric` / `security-crypto` even
> when encryption and biometric auth are off — there is no upstream
> “unencrypted-only” build flavour. A Gradle exclude does not compile.
>
> Replacing or forking that plugin solely to drop those transitive AARs would
> be a large rewrite for no functional change. Per Inclusion Policy, FLOSS
> prebuilts from Maven Central are allowed; Node/npm for the Capacitor web
> build is also an accepted path. We would rather keep the maintained plugin
> than vendor a fork of the entire SQLite stack.
>
> Happy to discuss if you prefer we strip the unused biometric permissions via
> manifest merger (`tools:node="remove"`) while keeping the plugin, or if you
> consider sqlcipher acceptable here as a required transitive of that plugin.
> Guidance welcome.

## Reply notes (review: build the Swift SDK)

For [fdroiddata!45187](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/45187)
/ similar review comments:

- We no longer install the prebuilt
  `swift-*-RELEASE_android.artifactbundle` from download.swift.org into the
  F-Droid recipe.
- `scripts/fdroid-prebuild.sh` rebuilds the Android target stdlib / Dispatch /
  Foundation via `scripts/build-swift-android-sdk.sh` (vendored helpers from
  [finagolfin/swift-android-sdk](https://github.com/finagolfin/swift-android-sdk)).
- Host Swift compiler comes from Debian `swiftlang` on F-Droid; NDK **r27d**
  from the recipe `ndk:` field (fdroidserver sets `ANDROID_NDK_HOME`). CMake
  and patchelf are Debian packages. APK `.so`s come from the from-source
  rebuild + `package-android-jni.sh`.
- A GHCR Docker image may exist for other apps / local speed — **not** used by
  the F-Droid `prebuild`.
- Expect ~25–40 min SDK rebuild and ~100 MB `jniLibs` (mostly Foundation ICU).
- Termux: no packages.termux.dev debs on the default path; `libandroid-spawn`
  from vendored source (`native/libandroid-spawn/`); XCTest/Testing skipped
  (no `libandroid-execinfo`).
- Recipe runs `fdroid-prebuild.sh` in `prebuild:` so the scanner sees yarn /
  Swift outputs (not hidden under `build:`).

## Submit / verify

1. Fork [fdroiddata](https://gitlab.com/fdroid/fdroiddata), branch `si.stenar.smsloc`
2. Copy `docs/fdroid/metadata/si.stenar.smsloc.yml` → `metadata/si.stenar.smsloc.yml`
3. Set `Builds[0].commit` to the release tag or commit SHA that contains the
   from-source prebuild (retag if needed after landing these scripts)
4. `fdroid lint si.stenar.smsloc` and build in the buildserver container (see
   [Quick Start](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/))
5. Open / update MR: `New App: si.stenar.smsloc`
