# Tasks: F-Droid Inclusion Review Fixes

Do not implement until the human approves [plan.md](plan.md).
Do not `git push` until Task 7 is checked.

## Task 1: F-Droid NDK r27d + Debian cmake/patchelf ✅

**Description:** Stop curling NDK from `dl.google.com` and CMake/patchelf
tarballs. Recipe provides `ndk: r27d` and Debian `cmake` / `patchelf`.
Scripts fail closed with an install hint. Map F-Droid `ANDROID_NDK` /
`$$NDK$$` into `ANDROID_NDK_HOME` if needed.

**Acceptance criteria:**
- [x] `scripts/build-swift-android-sdk.sh` does not curl NDK, Kitware CMake,
      or NixOS patchelf
- [x] `docs/fdroid/metadata/si.stenar.smsloc.yml` has `ndk: r27d` and
      `cmake` + `patchelf` in `sudo`
- [x] Missing tools print a hint instead of downloading

**Verification:**
- [x] `./scripts/check-host-tooling.sh`
- [x] `grep -n 'ndk:' docs/fdroid/metadata/si.stenar.smsloc.yml`
- [x] Manual: `command -v cmake` / `patchelf` used when present

**Dependencies:** None

**Files likely touched:**
- `scripts/build-swift-android-sdk.sh`
- `scripts/fdroid-prebuild.sh`
- `docs/fdroid/metadata/si.stenar.smsloc.yml`
- `docs/fdroid.md`

**Estimated scope:** Medium (3–4 files)

## Task 2: Drop sqlcipher and biometric from Capacitor SQLite

**Description:** App already opens with `encrypted = false`. Remove
`net.zetetic:sqlcipher-android` and the biometric / security-crypto stack
from the Android build. Keep `@capacitor-community/sqlite` if an official
unencrypted/exclude path exists. If the plugin cannot build without
sqlcipher, **stop and ask** (do not swap plugins in this task).

**Acceptance criteria:**
- [ ] Release APK contains no `libsqlcipher.so`
- [ ] Merged manifest has no `USE_BIOMETRIC` / `USE_FINGERPRINT` from this
      stack
- [ ] `sqliteService.ts` still opens unencrypted; DB file path unchanged

**Verification:**
- [ ] `cd android && ./gradlew :app:assembleRelease` (existing jniLibs ok)
- [ ] `unzip -l .../app-release*.apk | grep -i sqlcipher` empty
- [ ] `yarn test:unit` if a small open-path test is added; else `yarn type-check`

**Dependencies:** None (parallel with Task 1)

**Files likely touched:**
- `android/app/build.gradle` (or a small gradle exclude next to the plugin)
- `src/services/sqliteService.ts` (only if API requires it)
- `src/services/sqliteService.spec.ts` (add only if logic changes)
- `android/app/src/main/AndroidManifest.xml` (only if we must strip perms)

**Estimated scope:** Medium (≤4 files). Stop if it needs a plugin swap.

## Checkpoint: Phase 1

- [ ] Host-tooling curls gone; recipe has `ndk: r27d` + cmake/patchelf
- [ ] APK has no sqlcipher / biometric from sqlite
- [ ] Human review before Swift SDK rebuild

## Task 3: Drop unused Termux sysroot debs

**Description:** Remove libcurl, zlib, libxml2, openssl, libssh2, nghttp2/3,
liblzma, libiconv (and execinfo if unused) from
`get-packages-and-swift-source.swift` so the SDK build does not download
those Termux binaries. Keep spawn packages **out** of this task (Task 4).
If Foundation fails to configure/link, restore nothing from
`packages.termux.dev` — checkpoint and ask.

**Acceptance criteria:**
- [ ] Those package names are gone from the Termux fetch list
- [ ] Swift Android SDK still builds for aarch64 with existing spawn workaround
      *or* work stops with a recorded linker error for the human

**Verification:**
- [ ] `grep termuxPackages native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift`
- [ ] `./scripts/build-swift-android-sdk.sh` (reuse `SMSLOC_SWIFT_CACHE`; ~25–40 min first dirty run)

**Dependencies:** Task 1

**Files likely touched:**
- `native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift`
- `native/OfflineMapServer/swift-android-sdk/README.md`

**Estimated scope:** Small (1–2 files) + long compile

## Task 4: `libandroid-spawn` from vendored source

**Description:** Vendor Termux android-spawn **source** (not `.deb` / `.a`)
under `native/libandroid-spawn/`. Compile with NDK clang, 16KB max-page-size,
`soname` `libandroid-spawn.so`. Point `package-android-jni.sh` at that `.so`.
Remove Termux `.a` copy from `build-swift-android-sdk.sh` and the relink-from-`.a`
path. Drop remaining `libandroid-spawn` / `-static` Termux fetches if headers
can be vendored too.

**Acceptance criteria:**
- [ ] APK `lib/arm64-v8a/libandroid-spawn.so` is produced by our clang line
- [ ] No download of spawn from `packages.termux.dev`
- [ ] `libFoundation.so` / `libOfflineMapServerCore.so` still resolve spawn

**Verification:**
- [ ] `./native/OfflineMapServer/scripts/package-android-jni.sh`
- [ ] `llvm-readelf -d android/app/src/main/jniLibs/arm64-v8a/*.so | grep NEEDED`
- [ ] `grep -n packages.termux.dev native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift` — spawn not fetched

**Dependencies:** Task 1, Task 3 (SDK without extra debs)

**Files likely touched:**
- `native/libandroid-spawn/` (vendored C + LICENSE)
- `native/OfflineMapServer/scripts/package-android-jni.sh`
- `scripts/build-swift-android-sdk.sh`
- `native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift`

**Estimated scope:** Medium (packaging + small C tree). If >5 files, split
headers vs link script in implementation — do not expand to curl-from-source.

## Checkpoint: Phase 2

- [ ] JNI package has no Termux-binary spawn; unused curl debs not fetched
- [ ] Human review before recipe stage move

## Task 5: Scanner-visible prebuild

**Description:** Run `./scripts/fdroid-prebuild.sh` from F-Droid `prebuild:`
(path relative to `subdir: android/app`). Leave `gradle: yes` as the compile
step. Do not keep yarn/Swift/JNI only under `build:` to dodge the scanner.

**Acceptance criteria:**
- [ ] Draft metadata invokes prebuild in `prebuild:`, not only `build:`
- [ ] `scanignore` remains only for from-source `jniLibs` if still required

**Verification:**
- [ ] Read `docs/fdroid/metadata/si.stenar.smsloc.yml` against F-Droid
      scan-after-prebuild order
- [ ] `fdroid lint` if the tool is available locally

**Dependencies:** Tasks 1–4 (do not expose Termux/sqlcipher blobs)

**Files likely touched:**
- `docs/fdroid/metadata/si.stenar.smsloc.yml`

**Estimated scope:** Small

## Task 6: Docs match the recipe

**Description:** Update MaintainerNotes and `docs/fdroid.md`: NDK from recipe,
Debian cmake/patchelf, no Termux binaries, sqlite unencrypted without
sqlcipher, prebuild-before-scan (not “after the scanner” as a hiding tactic).

**Acceptance criteria:**
- [ ] Docs no longer claim cmake/patchelf auto-fetch or NDK curl
- [ ] Scanner notes describe visibility, not evasion

**Verification:**
- [ ] Manual read of `docs/fdroid.md` vs metadata

**Dependencies:** Task 5

**Files likely touched:**
- `docs/fdroid.md`
- `docs/fdroid/metadata/si.stenar.smsloc.yml` (MaintainerNotes)

**Estimated scope:** Small

## Task 7: Phone checklist (blocking for push)

**Description:** Install the unsigned/debug APK from this work on the
maintainer phone. No git push in this task.

**Acceptance criteria:**
- [ ] Cold start; contacts/settings open
- [ ] Contact add/edit persists across restart
- [ ] Offline map: tiles from loopback if a pack is installed; no `dlopen`
      crash on spawn if no pack

**Verification:**
- [ ] Manual on device (not a screenshot-only check)
- [ ] `yarn type-check` / `yarn lint` on the branch before asking to commit

**Dependencies:** Tasks 1–6 and a local APK (`yarn fdroid-build` or
`assembleRelease` after prebuild)

**Files likely touched:** None (verification only)

**Estimated scope:** XS

## Checkpoint: Complete

- [ ] Spec success criteria in SPEC.md are met
- [ ] Phone checklist passed
- [ ] Human approves; push only if explicitly requested
