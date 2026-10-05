# Implementation Plan: Remove dead boot / package-replace receivers

## Overview

Delete the two broadcast receivers that try to open `MainActivity` on boot and on package replace, plus the `RECEIVE_BOOT_COMPLETED` permission. No replacement behavior. Background SMS continues via existing manifest-registered `SmsReceiver`.

## Architecture Decisions

- **Delete, don’t stub.** Empty receivers still add exported surface and permission noise; remove the components entirely.
- **No WorkManager / FGS on boot.** Spec forbids replacement auto-start unless asked later. SMS path does not need process warm-up via UI.
- **Manifest + Java only.** No docs, JS, or battery-prompt changes in this slice.

## Dependency Graph

```
AndroidManifest.xml (permission + receiver registrations)
    │
    └── BootReceiver.java / PackageReplaceReceiver.java (implementations)
```

Order: remove Java classes and manifest entries in one vertical slice (same change set), then verify build + grep.

## Task List

### Phase 1: Removal

- [x] Task 1: Delete receivers and clean manifest (`tasks/todo.md`)

### Checkpoint: After Task 1

- [x] Grep clean for class names + `RECEIVE_BOOT_COMPLETED`
- [x] `:app:assembleDebug` succeeds
- [ ] Human review before commit/PR

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hidden caller still references deleted classes | Med | Grep before claiming done; assembleDebug fails on broken refs |
| OEM somehow relied on boot UI open | Low | BAL already blocks on minSdk 29; SMS path independent |
| Accidental edit to SmsReceiver | Med | Touch only the three deletion targets + manifest |

## Open Questions

None.
