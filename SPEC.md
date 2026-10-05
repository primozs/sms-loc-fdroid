# Spec: Remove dead boot / package-replace activity launches

## Objective

Remove `BootReceiver` and `PackageReplaceReceiver`, which call `startActivity(MainActivity)` on `BOOT_COMPLETED` / `MY_PACKAGE_REPLACED`. On Android 10+ (this app’s `minSdk` 29) those starts are blocked by background activity launch (BAL) restrictions, so the receivers are no-ops. Removing them cuts dead code, the unused `RECEIVE_BOOT_COMPLETED` permission, and two exported receivers.

**User impact:** None expected. Hands-free SMS location replies already run via `SmsReceiver` → `LocationRetrieverService` without `MainActivity`. The app must not auto-open after boot or update (and already does not on supported devices).

**Success:** Receivers and permission gone; SMS receive/respond path unchanged; Android project still builds.

## Tech Stack

- Existing Android app module (`android/`, Java, Capacitor 8)
- `minSdkVersion` 29, `targetSdkVersion` 36
- No new dependencies

## Commands

```bash
# Web / shared (repo hygiene; this change is Android-only)
yarn lint
yarn type-check

# Android compile check (from android/)
cd android && ./gradlew :app:assembleDebug

# Optional device smoke (manual)
# yarn ionic-capacitor-run-android
# Then: reboot device → confirm app does not auto-open
# Send Loc? from a whitelisted contact → confirm native reply still works with UI killed
```

## Project Structure

```
android/app/src/main/AndroidManifest.xml
  → drop RECEIVE_BOOT_COMPLETED + both <receiver> entries
android/app/src/main/java/si/stenar/smsloc/core/BootReceiver.java
  → delete
android/app/src/main/java/si/stenar/smsloc/core/PackageReplaceReceiver.java
  → delete
android/.../core/SmsReceiver.java
  → leave unchanged (background SMS entry)
android/.../core/LocationRetrieverService.java
  → leave unchanged
```

No JS/Vue changes. No new docs required (nothing in README/AGENTS documents these receivers).

## Code Style

Deletion only — match existing manifest formatting; do not reflow unrelated XML. No new classes or abstractions.

## Testing Strategy

- No unit tests exist for these receivers; do not add framework tests for deleted code.
- Verification: `assembleDebug` succeeds; grep confirms no remaining references to the deleted classes or `RECEIVE_BOOT_COMPLETED`.
- Manual (preferred on device): reboot / app update does not open UI; SMS `Loc?` still handled with app backgrounded/killed.

## Boundaries

- **Always:** Keep `SmsReceiver` and `LocationRetrieverService` intact; verify no remaining Java/manifest references after delete; leave the system in a buildable state.
- **Ask first:** Any replacement auto-start (WorkManager, FGS on boot); changes to `MainActivity` battery-optimization prompt; SMS wire format; SDK bumps.
- **Never:** Start `MainActivity` (or any UI) from a boot/update broadcast; add Google Play Services; restore “open app on boot” behavior.

## Success Criteria

- [x] `BootReceiver.java` and `PackageReplaceReceiver.java` deleted
- [x] Manifest has no `BootReceiver` / `PackageReplaceReceiver` / `RECEIVE_BOOT_COMPLETED`
- [x] Repo grep shows no references to those class names or permission
- [x] `:app:assembleDebug` succeeds
- [x] SMS background path untouched (no edits to `SmsReceiver` / `LocationRetrieverService` unless a compile error forces a trivial import cleanup — none expected)

## Open Questions

None — scope approved 2026-10-05.
