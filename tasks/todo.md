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

## Task 2: Drop sqlcipher and biometric from Capacitor SQLite — DEFERRED

**Decision (2026-10-05):** No code change. `@capacitor-community/sqlite`
hard-links SQLCipher + biometric/security-crypto in Java; Gradle exclude
does not compile. Forking / rewriting the plugin is out of scope. Discuss
with Inclusion: FLOSS Maven Central dependency required by the only mature
Capacitor SQLite plugin; DB opened unencrypted; biometric unused at runtime.
Draft reply in `docs/fdroid.md` (sqlcipher / biometric section).

**Acceptance criteria:**
- [x] Maintainer reply drafted (no fork)
- [ ] Inclusion accepts or names a required follow-up
- [ ] (optional later) manifest `tools:node="remove"` for biometric perms only

**Dependencies:** None

**Estimated scope:** Discussion only (deferred)

## Checkpoint: Phase 1

- [ ] Host-tooling curls gone; recipe has `ndk: r27d` + cmake/patchelf
- [ ] APK has no sqlcipher / biometric from sqlite
- [ ] Human review before Swift SDK rebuild

## Task 3: Drop unused Termux sysroot debs ✅

**Description:** Remove libcurl, zlib, libxml2, openssl, libssh2, nghttp2/3,
liblzma, libiconv from `get-packages-and-swift-source.swift`. Keep spawn +
execinfo (spawn → Task 4). If Foundation fails, restore nothing from
`packages.termux.dev` — checkpoint and ask.

**Acceptance criteria:**
- [x] Those package names are gone from the Termux fetch list
- [x] Fetch verified: only `libandroid-execinfo` + spawn (+ static) debs
      downloaded. Full SDK compile on this host failed **before** Foundation
      link with incomplete local NDK 27.1 (missing `crtbegin_dynamic.o`) —
      unrelated to Termux drop; do **not** restore curl debs. Re-verify SDK
      build on F-Droid `ndk: r27d` / a complete NDK install (Task 4+).

**Verification:**
- [x] `./scripts/check-termux-packages.sh`
- [x] Build log: Termux section only fetch spawn/execinfo; cmake failed on
      NDK crt (recorded in `/tmp/smsloc-sdk-build.log`)
- [ ] Re-verify: Foundation needs LibXml2 — build `gnome/libxml2` via
      `--static-libxml2` (not Termux); `FOUNDATION_BUILD_NETWORKING=OFF`
      (log `/tmp/smsloc-sdk-build6.log`)

**Dependencies:** Task 1

**Files likely touched:**
- `native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift`
- `native/OfflineMapServer/swift-android-sdk/README.md`

**Estimated scope:** Small (1–2 files) + long compile

## Task 4: `libandroid-spawn` from vendored source ✅

**Description:** Vendor Termux android-spawn **source** (not `.deb` / `.a`)
under `native/libandroid-spawn/`. Compile with NDK clang, 16KB max-page-size,
`soname` `libandroid-spawn.so`. Point `package-android-jni.sh` at that `.so`.
Remove Termux `.a` copy from `build-swift-android-sdk.sh` and the relink-from-`.a`
path. Drop remaining `libandroid-spawn` / `-static` Termux fetches if headers
can be vendored too.

**Acceptance criteria:**
- [x] APK `lib/arm64-v8a/libandroid-spawn.so` is produced by our clang line
      (`scripts/build-libandroid-spawn.sh`)
- [x] No download of spawn from `packages.termux.dev`
- [x] `libFoundation.so` / `libOfflineMapServerCore.so` still resolve spawn
      (soname unchanged)

**Verification:**
- [x] `./scripts/check-termux-packages.sh`
- [x] `./scripts/build-libandroid-spawn.sh` → 16KB-aligned `.so`
- [x] Full `./native/OfflineMapServer/scripts/package-android-jni.sh` when
      packaging next (Task 7 phone)
- [x] Spawn gone from `termuxPackages` in get-packages

**Dependencies:** Task 1, Task 3 (SDK without extra debs)

**Files likely touched:**
- `native/libandroid-spawn/` (vendored C + LICENSE)
- `scripts/build-libandroid-spawn.sh`
- `native/OfflineMapServer/scripts/package-android-jni.sh`
- `scripts/build-swift-android-sdk.sh`
- `native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift`

**Estimated scope:** Medium (packaging + small C tree). If >5 files, split
headers vs link script in implementation — do not expand to curl-from-source.

## Checkpoint: Phase 2

- [ ] JNI package has no Termux-binary spawn; unused curl debs not fetched
- [ ] Human review before recipe stage move

## Task 5: Scanner-visible prebuild ✅

**Description:** Run `./scripts/fdroid-prebuild.sh` from F-Droid `prebuild:`
(path relative to `subdir: android/app`). Leave `gradle: yes` as the compile
step. Do not keep yarn/Swift/JNI only under `build:` to dodge the scanner.

**Acceptance criteria:**
- [x] Draft metadata invokes prebuild in `prebuild:`, not only `build:`
- [x] No `scanignore` unless Inclusion asks (jniLibs are from-source)

**Verification:**
- [x] Read `docs/fdroid/metadata/si.stenar.smsloc.yml` against F-Droid
      scan-after-prebuild order
- [ ] `fdroid lint` if the tool is available locally

**Dependencies:** Tasks 1–4 (do not expose Termux/sqlcipher blobs)

**Files likely touched:**
- `docs/fdroid/metadata/si.stenar.smsloc.yml`

**Estimated scope:** Small

## Task 6: Docs match the recipe ✅

**Description:** Update MaintainerNotes and `docs/fdroid.md`: NDK from recipe,
Debian cmake/patchelf, no Termux binaries, sqlite unencrypted without
sqlcipher, prebuild-before-scan (not “after the scanner” as a hiding tactic).

**Acceptance criteria:**
- [x] Docs no longer claim cmake/patchelf auto-fetch or NDK curl
- [x] Scanner notes describe visibility, not evasion

**Verification:**
- [x] Manual read of `docs/fdroid.md` vs metadata

**Dependencies:** Task 5

**Files likely touched:**
- `docs/fdroid.md`
- `docs/fdroid/metadata/si.stenar.smsloc.yml` (MaintainerNotes)

**Estimated scope:** Small

## Task 7: Phone checklist (blocking for push) ✅

**Description:** Install the unsigned/debug APK from this work on the
maintainer phone. No git push in this task. Runbook:
[`docs/fdroid-local-build.md`](../docs/fdroid-local-build.md).

**Acceptance criteria:**
- [x] Cold start; contacts/settings open
- [x] Contact add/edit persists across restart
- [x] Offline map: tiles from loopback if a pack is installed; no `dlopen`
      crash on spawn if no pack

**Verification:**
- [x] Manual on device (not a screenshot-only check)
- [x] `yarn type-check` / `yarn lint` on the branch before asking to commit

**Dependencies:** Tasks 1–6 and a local APK (`yarn fdroid-build` or
`assembleRelease` after prebuild)

**Files likely touched:** None (verification only)

**Estimated scope:** XS

## Checkpoint: Complete

- [ ] Spec success criteria in SPEC.md are met
- [x] Phone checklist passed
- [ ] Human approves; push only if explicitly requested
