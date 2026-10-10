# Implementation Plan: Drop Termux libandroid-execinfo

## Overview

Stop fetching any Termux `.deb` for the SMSLoc Swift Android SDK rebuild so
Inclusion’s remaining binary-build-input note goes away. Prefer drop over
vendoring: empty the Termux package list, create a minimal empty sysroot when
no debs unpack, skip XCTest/Swift Testing (they are why execinfo was pulled),
tighten the check script, update docs. No release tag / fdroiddata pin.

Spec: [`SPEC.md`](../SPEC.md).

## Architecture Decisions

1. **Drop, don’t vendor.** mezinster allowed either; product never ships Testing.
2. **Skip XCTest/Testing up front** in `build-swift-android-sdk.sh` (remove
   `--xctest` / `--install-xctest`). Testing’s CMake already links
   `android-execinfo`; waiting for a 30–40 min fail is waste. Mark with a
   `ponytail:` comment.
3. **Empty sysroot skeleton required.** Today
   `get-packages-and-swift-source.swift` only creates `$sdkDir/usr` by unpacking
   a Termux deb. With `termuxPackages = []`, that path never runs — must
   `mkdir` a minimal `usr/{lib,include}` (and skip Packages/deb curl when the
   list is empty) so `--cross-compile-deps-path` still exists for spawn +
   libxml2 + install-destdir.
4. **`BUILD_SWIFT_PM` path untouched for now.** Optional env still appends
   `ncurses`/`libsqlite`; SMSLoc prebuild does not set it. Check script asserts
   default list has zero packages (no quoted names in the initial
   `termuxPackages` assignment).
5. **Fix first, pin later.** No version bump / MR recipe update in this plan.

## Dependency graph

```
empty termuxPackages + empty-sysroot mkdir
        │
        ├── skip XCTest/Testing in build-script flags
        │
        ├── check-termux-packages.sh (fail if any deb remains)
        │
        └── docs/metadata wording
                │
                └── verify: SDK rebuild (fresh WORK) + package-android-jni
```

## Task List

### Phase 1: Contract + build path

- [ ] Task 1: Empty Termux fetch + empty sysroot skeleton
- [ ] Task 2: Skip XCTest/Swift Testing in SDK build-script
- [ ] Task 3: Tighten `check-termux-packages.sh` to require zero packages

### Checkpoint: Static gate

- [ ] `./scripts/check-termux-packages.sh` exits 0
- [ ] Grep shows no `libandroid-execinfo` in `termuxPackages` default
- [ ] Human skim of get-packages empty-sysroot path before long build

### Phase 2: Docs

- [ ] Task 4: Update fdroid docs + metadata draft + swift-android-sdk README

### Checkpoint: Wording

- [ ] No doc claims “remaining Termux deb is libandroid-execinfo”

### Phase 3: Prove

- [ ] Task 5: Fresh SDK rebuild + JNI pack smoke

### Checkpoint: Complete

- [ ] Spec success criteria met
- [ ] Ready for human review (then separate tag/MR work)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Empty `termuxPackages` leaves no `$sdkDir/usr` | High — SDK script exits “missing cross-compile deps” | Task 1: mkdir skeleton; skip Packages curl when empty |
| Stale WORK still has old Termux unpack / marker | Med — false “green” without re-fetch | Task 5: wipe WORK or force re-run past `if ! -d swift` |
| Something besides Testing still links execinfo | Med — SDK link fails | Inspect link error; ask before vendoring |
| `BUILD_SWIFT_PM` still adds Termux debs | Low — unused in SMSLoc | Document; leave optional path alone |
| Long rebuild time | Low | Skip tests frameworks first so one rebuild can succeed |

## Open Questions

None blocking. If Task 5 fails for a non-Testing reason, stop and ask before
vendoring execinfo.
