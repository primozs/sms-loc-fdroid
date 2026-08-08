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

Prerequisites on the host:

1. Node.js + Yarn (Classic) matching `package.json` / `yarn.lock`
2. Android SDK (this repo: compile/target SDK from `android/variables.gradle`)
3. Swift **6.3.3** + Android Swift SDK artifact (see
   [`native/OfflineMapServer/README.md`](../native/OfflineMapServer/README.md))
4. NDK **r27d** path expected by
   `native/OfflineMapServer/scripts/package-android-jni.sh`

Then:

```sh
./scripts/fdroid-build.sh
# or: yarn fdroid-build
```

Pipeline:

1. `./scripts/fdroid-prebuild.sh` — Ubuntu 24.04 Swift host toolchain under
   `$HOME/.cache/smsloc-fdroid-swift` + Swift Android SDK + NDK r27d, then
   `yarn install`, `configure:prod`, `package-android-jni.sh`, `ionic-sync`,
   and cleanup of `node_modules` / SPM `.build` (keeps scanner clean)
2. `cd android && ./gradlew assembleRelease` — **unsigned** APK under
   `android/app/build/outputs/apk/release/`

The fdroiddata recipe calls the same `fdroid-prebuild.sh` from `prebuild`.

## Release tags

For each release shipped to F-Droid:

1. Align `package.json` `version` with `android/app/build.gradle` `versionName`
2. Bump `versionCode` (monotonic integer)
3. Add `fastlane/metadata/android/*/changelogs/<versionCode>.txt`
4. Commit, tag `v<versionName>` (e.g. `v0.0.12`), push tag

Autoupdate in metadata uses `UpdateCheckMode: Tags`.

## AntiFeatures

None declared: online map styles are optional; core SMS location works offline.
Offline map pack is an explicit user download.

## Scanner notes

- Do not commit `google-services.json` or `jniLibs/**/*.so`
- GMS plugin is only applied if that JSON exists (keep it absent)
- Prebuild installs Swift under `$HOME` (not the VCS tree) and removes
  `node_modules` / SPM `.build` before the binary scan
- fdroiddata uses `scanignore: android/app/src/main/jniLibs` for libs built
  in prebuild (OfflineMapServer + Swift Android runtime)

## Submit / verify

1. Fork [fdroiddata](https://gitlab.com/fdroid/fdroiddata), branch `si.stenar.smsloc`
2. Copy `docs/fdroid/metadata/si.stenar.smsloc.yml` → `metadata/si.stenar.smsloc.yml`
3. Set `Builds[0].commit` to the release tag or commit SHA
4. `fdroid lint si.stenar.smsloc` and build in the buildserver container (see
   [Quick Start](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/))
5. Open MR: `New App: si.stenar.smsloc`

Expect review focus on the Swift Android SDK install in `sudo`/`prebuild`
(uncommon toolchain; packagers may adjust the recipe).
