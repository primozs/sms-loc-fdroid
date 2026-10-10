# Tasks: Drop Termux libandroid-execinfo

## Task 1: Empty Termux fetch + empty sysroot skeleton

**Description:** Stop listing `libandroid-execinfo`. When `termuxPackages` is
empty, do not curl `packages.termux.dev` Packages/debs; create a minimal
`$sdkDir/usr/{lib,include}` so the cross-compile deps path still exists.

**Acceptance criteria:**
- [x] Default `termuxPackages` is empty (no execinfo)
- [x] Empty list → no deb download; sysroot `usr` tree exists
- [x] Comments no longer say Testing needs Termux execinfo

**Verification:**
- [ ] Manual: read the empty-list branch; `./scripts/check-termux-packages.sh` after Task 3

**Dependencies:** None

**Files likely touched:**
- `native/OfflineMapServer/swift-android-sdk/get-packages-and-swift-source.swift`

**Estimated scope:** S

---

## Task 2: Skip XCTest / Swift Testing in SDK build

**Description:** Remove `--xctest` / `--install-xctest` from
`build-swift-android-sdk.sh` so the product SDK rebuild does not link
`android-execinfo`. Add a short `ponytail:` note. Avoid fetching/building
test frameworks if cheap (e.g. drop from `swiftRepos` only if it does not
break finagolfin patch apply — prefer minimal flag change first).

**Acceptance criteria:**
- [x] Default SMSLoc SDK build-script invocation does not pass `--xctest` /
      `--install-xctest`
- [x] `ponytail:` comment documents ceiling + upgrade path

**Verification:**
- [x] `grep -n -- '--xctest' scripts/build-swift-android-sdk.sh` shows none
      (or only in comments)

**Dependencies:** None (can parallel Task 1)

**Files likely touched:**
- `scripts/build-swift-android-sdk.sh`

**Estimated scope:** S

---

## Task 3: Check script requires zero Termux packages

**Description:** Replace “OK: still lists libandroid-execinfo” with a hard
fail if any package name remains in the default `termuxPackages` list.
Keep existing spawn/curl/xml negative checks and spawn-from-source checks.

**Acceptance criteria:**
- [x] Script fails if `libandroid-execinfo` (or any other) appears in the
      default list
- [x] Script passes when the list is empty
- [x] Still asserts `--static-libxml2` + spawn from source

**Verification:**
- [x] `./scripts/check-termux-packages.sh` exits 0

**Dependencies:** Task 1

**Files likely touched:**
- `scripts/check-termux-packages.sh`

**Estimated scope:** XS

---

## Checkpoint: Static gate (after Tasks 1–3)

- [x] `./scripts/check-termux-packages.sh` exits 0
- [x] No default Termux package names in get-packages source
- [ ] Human skim empty-sysroot path before long build

---

## Task 4: Docs + metadata wording

**Description:** Update Inclusion-facing docs so they state zero Termux debs
(not “only remaining is execinfo”). Align local-build check description.

**Acceptance criteria:**
- [x] `docs/fdroid.md` Termux bullets say no Termux debs
- [x] `docs/fdroid/metadata/si.stenar.smsloc.yml` Matches / Notes updated
- [x] `native/OfflineMapServer/swift-android-sdk/README.md` updated
- [x] `docs/fdroid-local-build.md` check-script blurb accurate if needed

**Verification:**
- [x] `rg -n 'libandroid-execinfo|remaining Termux' docs/ native/OfflineMapServer/swift-android-sdk/README.md`
      shows only historical “removed” wording if any, not “still fetched”

**Dependencies:** Tasks 1–3 (wording matches reality)

**Files likely touched:**
- `docs/fdroid.md`
- `docs/fdroid/metadata/si.stenar.smsloc.yml`
- `docs/fdroid-local-build.md`
- `native/OfflineMapServer/swift-android-sdk/README.md`

**Estimated scope:** S–M (docs only)

---

## Checkpoint: Wording (after Task 4)

- [x] No doc claims a remaining Termux execinfo deb

---

## Task 5: Prove SDK rebuild + JNI pack

**Description:** Run a fresh from-source SDK build (invalidate stale WORK /
marker as needed) and confirm no `libandroid-execinfo_*.deb` download, then
smoke `package-android-jni.sh`.

**Acceptance criteria:**
- [ ] Build log has no `Downloading libandroid-execinfo_` / Termux deb fetch
- [ ] `build-swift-android-sdk.sh` completes successfully
- [ ] `package-android-jni.sh` produces OfflineMapServer `.so`s under
      `android/app/src/main/jniLibs/arm64-v8a/`

**Verification:**
- [ ] Build: `./scripts/build-swift-android-sdk.sh` (long)
- [ ] Pack: `./native/OfflineMapServer/scripts/package-android-jni.sh`
- [ ] Manual: confirm jniLibs outputs exist; do **not** commit them

**Dependencies:** Tasks 1–4

**Files likely touched:** none (verify only), unless build reveals a small fix

**Estimated scope:** S (wall-clock long)

---

## Checkpoint: Complete

- [ ] All SPEC.md success criteria checked
- [ ] No tag / fdroiddata pin in this change
- [ ] Human review before `/as-build` follow-ups or release bump
