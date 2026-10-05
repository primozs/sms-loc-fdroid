# Tasks: Remove dead boot / package-replace receivers

## Task 1: Delete receivers and clean manifest

**Description:** Remove `BootReceiver` and `PackageReplaceReceiver` Java sources, their `<receiver>` blocks in `AndroidManifest.xml`, and the `RECEIVE_BOOT_COMPLETED` permission. Leave `SmsReceiver`, `LocationRetrieverService`, and `MainActivity` alone.

**Acceptance criteria:**
- [x] Both receiver `.java` files deleted
- [x] Manifest no longer declares those receivers or `RECEIVE_BOOT_COMPLETED`
- [x] No remaining references in the repo to `BootReceiver`, `PackageReplaceReceiver`, or `RECEIVE_BOOT_COMPLETED`

**Verification:**
- [x] `rg 'BootReceiver|PackageReplaceReceiver|RECEIVE_BOOT_COMPLETED' android/` returns no matches
- [x] Build succeeds: `cd android && ./gradlew :app:assembleDebug`
- [ ] Manual (optional): reboot does not open app; `Loc?` still answered with UI killed

**Dependencies:** None

**Files likely touched:**
- `android/app/src/main/java/si/stenar/smsloc/core/BootReceiver.java` (delete)
- `android/app/src/main/java/si/stenar/smsloc/core/PackageReplaceReceiver.java` (delete)
- `android/app/src/main/AndroidManifest.xml`

**Estimated scope:** Small (1–2 files + 2 deletes)

---

## Checkpoint: Complete

- [x] All Task 1 acceptance criteria met
- [x] Spec success criteria in `SPEC.md` satisfied
- [x] Ready for human review / commit when asked
