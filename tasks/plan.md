# Implementation Plan: F-Droid Inclusion Review Fixes

## Overview

Clear Inclusion blockers for `si.stenar.smsloc`: Debian/F-Droid host tools
instead of tarball curls, drop sqlcipher/biometric from an unencrypted DB,
drop Termux `.deb`s that we do not link (rebuild spawn from source if
Foundation still needs it), then move yarn/Swift/JNI into `prebuild:` so the
scanner sees the tree. Phone-test the APK before any git push.

Specs: [SPEC.md](../SPEC.md), [CAPABILITY-MAP.md](../CAPABILITY-MAP.md).

## Architecture Decisions

- **NDK:** Recipe `ndk: r27d`. Scripts require `ANDROID_NDK_HOME` or F-Droid’s
  `ANDROID_NDK` / `$$NDK$$` — no `dl.google.com` zip. Local `fdroid-build.sh`
  uses an already-installed NDK; fail with an install hint if missing (no
  hidden curl).
- **CMake / patchelf:** `command -v` only; add both to recipe `sudo`. Remove
  Kitware/NixOS tarball fetches from `scripts/build-swift-android-sdk.sh`.
- **SQLite:** Keep `@capacitor-community/sqlite` and `encrypted = false` if we
  can stop pulling `net.zetetic:sqlcipher-android` and biometric. JS DB is
  **not** the Java `smslocSQLite.db` (`Sqlite.java`) — do not “just use”
  `SQLiteOpenHelper` without an explicit plugin swap (ask first).
- **Termux:** Drop curl/xml/openssl/ssh/nghttp/lzma/iconv (and execinfo if
  unused) from `get-packages-and-swift-source.swift` first. Do **not** expect
  to drop `libandroid-spawn`: `libFoundation.so` already `NEEDED`s it. Vendor
  Termux **source** (small C) under `native/libandroid-spawn/` and compile with
  NDK clang + 16KB pages. Stop copying `packages.termux.dev` `.a` / `.so`.
- **Scanner last:** After blobs are gone, move `./scripts/fdroid-prebuild.sh`
  from `build:` to `prebuild:`. No `scanignore` for from-source `jniLibs`
  unless Inclusion asks after reviewing those `.so`s.
  Do not use `build:` to hide `node_modules`.
- **Push:** Out of scope until Task 8 (phone) is checked off.

## Dependency graph

```
host-tooling (NDK/cmake/patchelf)
    │
    ├── unencrypted-sqlite (independent of Swift; gradle APK check)
    │
    └── termux drop unused debs → spawn-from-source → package-android-jni
            │
            └── scanner-visibility (prebuild:) → phone gate → (later) push
```

Parallel: Tasks 1 and 2. Sequential: 3 → 4 → 5 → 6 → 7 → 8.

## Task List

### Phase 1: Host tools + SQLite (no Swift rebuild required)

- [x] Task 1: F-Droid NDK r27d + Debian cmake/patchelf; no tarball curls
- [x] Task 2: Drop sqlcipher / biometric — **deferred** (discuss with Inclusion; no fork)

### Checkpoint: Phase 1

- [ ] `grep` shows no Google NDK / Kitware CMake / NixOS patchelf curl in the
      F-Droid script path
- [ ] Metadata has `ndk: r27d` and `cmake` `patchelf` in `sudo`
- [ ] `assembleRelease` APK has no `libsqlcipher.so` and no biometric perms
      from this plugin (can use existing `jniLibs`)
- [ ] Review with human before the long Swift SDK rebuild

### Phase 2: Termux (drop then spawn-from-source)

- [x] Task 3: Stop fetching unused Termux sysroot debs; SDK rebuild with
      `--static-libxml2` + networking off verified (artifactbundle built)
- [x] Task 4: Build `libandroid-spawn` from vendored source; stop Termux `.a`

### Checkpoint: Phase 2

- [x] SDK rebuild succeeded; spawn from-source script verified (16KB `.so`)
- [x] No `packages.termux.dev` fetch for android-spawn
- [x] Full `package-android-jni.sh` + phone before push

### Phase 3: Scanner + device

- [x] Task 5: Move `fdroid-prebuild.sh` to recipe `prebuild:`
- [x] Task 6: Align `docs/fdroid.md` / MaintainerNotes with the new pipeline
- [x] Task 7: Phone checklist on maintainer device (blocking)

### Checkpoint: Complete

- [ ] All spec success criteria met
- [x] Phone checklist passed
- [ ] Ready for review; **do not push** until the user asks

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Community sqlite cannot compile without sqlcipher | High | Stop after Task 2 probe; ask before swapping plugins |
| Foundation fails without curl/xml sysroot | High | Task 3 is drop-first; if the SDK build fails, restore only libs the linker names — still from source, not Termux debs — and ask if that explodes scope |
| Spawn from source ABI/16KB mismatch | High | Same clang flags as current relink in `package-android-jni.sh` |
| Scanner flags remaining `.so` in `jniLibs` | Med | No `scanignore` by default (from-source libs should be visible); add only if Inclusion asks — never to hide Termux debs |
| Phase 2 SDK rebuild ~25–40 min | Med | Do Phase 1 first; reuse `SMSLOC_SWIFT_CACHE` |
| JS vs Java SQLite files | Low | Do not merge DBs in this plan |

## Open Questions

- Exact fdroidserver NDK env (`ANDROID_NDK_HOME` vs `$$NDK$$`) — confirm when
  editing metadata (Task 1).
- If sqlite exclude is impossible without a new Capacitor plugin: **ask**.
- If Foundation still requires curl headers at compile time after Task 3:
  **ask** before a from-source curl/openssl stack (that is a new module).

## Parallelization

- Tasks 1 and 2: safe to parallelize.
- Tasks 3–7: sequential (SDK output feeds JNI, recipe, phone).
