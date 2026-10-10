# Spec: Drop Termux libandroid-execinfo

## Objective

Remove the last Termux `.deb` fetch (`libandroid-execinfo` from
`packages.termux.dev`) from the Swift Android SDK rebuild so F-Droid Inclusion
no longer has a binary build-input finding for SMSLoc.

**User:** F-Droid reviewers (Inclusion) and maintainers of the from-source
prebuild.

**Why:** mezinster asked to build execinfo from source **or drop** the backtrace
dependency. Product OfflineMapServer only needs stdlib + Dispatch + Foundation
(+ from-source `libandroid-spawn`). Swift Testing / XCTest are not shipped in
the APK. Prefer drop over vendoring.

**XCTest (context):** Apple’s older Swift/ObjC unit-test library
(`swift-corelibs-xctest`). Swift Testing is the newer framework. The SDK script
still builds/installs them for a “full” SDK; OfflineMapServer does not link or
package them. If dropping execinfo breaks the SDK link because Testing still
builds, skip Testing/XCTest in that build.

## Tech Stack

- Existing: Bash prebuild (`scripts/build-swift-android-sdk.sh`), vendored
  finagolfin helpers under `native/OfflineMapServer/swift-android-sdk/`
- No new dependencies
- No app/Vue/Java runtime changes

## Commands

```bash
# Assert no Termux packages remain in the fetch list
./scripts/check-termux-packages.sh

# Rebuild Android Swift SDK (long; needs host Swift + NDK as today)
./scripts/build-swift-android-sdk.sh

# Package OfflineMapServer JNI (uses the rebuilt SDK)
./native/OfflineMapServer/scripts/package-android-jni.sh
```

Optional local F-Droid-shaped check: follow `docs/fdroid-local-build.md` only if
a full prebuild is already in use for this machine.

## Project Structure

```
native/OfflineMapServer/swift-android-sdk/
  get-packages-and-swift-source.swift  → empty / no Termux deb fetch
  README.md                            → drop execinfo note
scripts/
  build-swift-android-sdk.sh           → skip Testing/XCTest if needed
  check-termux-packages.sh             → require zero Termux packages
docs/
  fdroid.md                            → Inclusion reply: no Termux debs
  fdroid/metadata/si.stenar.smsloc.yml → metadata note update
SPEC.md                                → this file
```

## Code Style

- Minimal diff; match existing shell / Swift comment tone
- Prefer deleting Termux fetch over adding vendor trees
- Document the ceiling if we skip tests frameworks:

```bash
# ponytail: SDK build skips XCTest/Swift Testing (product JNI never links them).
# Upgrade: restore --xctest only with from-source execinfo if SDK self-tests return.
```

## Testing Strategy

1. **Static gate (required):** `check-termux-packages.sh` fails if any
   `termuxPackages` entry remains (including `libandroid-execinfo`).
2. **Build proof (required for “done”):** one successful
   `build-swift-android-sdk.sh` after the change (or documented failure → apply
   Testing/XCTest skip, then re-run to green).
3. **Pack smoke:** `package-android-jni.sh` still produces OfflineMapServer
   `.so`s without needing Termux sysroot libs.
4. No new Vitest/Cypress cases (native build only).

## Boundaries

- **Always:** Keep spawn from vendored source; keep gnome libxml2 static path;
  keep FoundationNetworking off; update docs/metadata that currently say
  “only remaining Termux deb is libandroid-execinfo”.
- **Ask first:** Vendoring execinfo instead of drop; changing SMS wire format;
  bumping Capacitor / minSdk / targetSdk; tagging a release / updating the
  fdroiddata MR pin.
- **Never:** Re-fetch Termux debs for curl/xml/ssl/spawn/execinfo; commit
  `jniLibs/**/*.so` or keystores; restore `capacitor-nodejs` for static maps.

## Success Criteria

- [x] `termuxPackages` has no packages (empty list / no fetch loop over Termux
      debs for the default SMSLoc SDK path)
- [x] `./scripts/check-termux-packages.sh` exits 0 and asserts **zero** Termux
      packages (not “OK still lists execinfo”)
- [x] `build-swift-android-sdk.sh` completes without downloading
      `libandroid-execinfo_*.deb` from `packages.termux.dev`
- [x] If needed: SDK build skips XCTest and/or Swift Testing; product pack still
      works
- [x] Docs + draft metadata no longer claim a remaining Termux execinfo deb
- [x] No version tag / fdroiddata pin in this change (fix first; pin later)

## Out of scope

- Vendoring `libandroid-execinfo` from termux-packages
- sqlcipher / biometric permission stripping
- Scanner/`scanignore` debates beyond wording that Termux debs are gone
- Release tag 0.0.27 and MR recipe bump

## Open Questions

None blocking. Resolved:

1. Fallback if link fails → skip Testing/XCTest (yes).
2. Tag/MR pin → later; this work is upstream fix only.
