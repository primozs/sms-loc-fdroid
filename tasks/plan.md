# Implementation Plan: LocationRetrieverService whitelist bypass

## Overview

Stop other apps from starting `LocationRetrieverService`, and make the service itself refuse to send a GPS SMS unless `address` is present and exactly matches a stored whitelist number. `SmsReceiver` stays the only starter and already checks the whitelist before `startForegroundService`.

## Architecture Decisions

- `android:exported="false"` is the boundary. No custom permission. Same-app `SmsReceiver` can still start the service.
- The allow/deny rule is a package-private `LocationReplyPolicy.mayReply(address, contacts)`, same shape as `OfflineMapServerPolicy`, so JUnit can run it without Robolectric. `onStartCommand` calls it before any GPS listener, `Utils.sendSms`, or `ResponseStore` write.
- Match is exact `String.equals` on `ContactData.address`. Null, empty, or no match is a deny. `SmsReceiver` already stores E.164.
- Deny path: `Log.w`, then `stopSelf()`, return `START_NOT_STICKY`. No location updates and no SMS.
- `SmsReceiver` uses `startForegroundService`. If `onStartCommand` returns without `startForeground`, Android kills the process a few seconds later (`ForegroundServiceDidNotStartInTimeException`). That happens on the deny path when a whitelisted start races with contact removal, or any future same-app caller. Deny therefore calls `startForeground` with the existing unlisted / not-whitelisted strings, then `stopForeground(true)` and `stopSelf()` in the same call. The notification is removed immediately and must not say a GPS fix is in progress. `NotificationHandler.createNotification` also writes a log row; that is an existing side effect of the helper, not a new SMS.
- Happy path is unchanged: foreground "request from {name}", GPS-only fix, `Loc:` SMS, response row.
- `SmsReceiver`'s unlisted SMS reply stays as it is.

## Dependency Graph

```
LocationReplyPolicy.mayReply
        │
        ▼
onStartCommand deny / allow
        │
        ▼
AndroidManifest exported="false"   (independent, same slice)
```

## Task List

### Phase 1: Gate

- [x] Task 1: `LocationReplyPolicy` allow/deny
- [x] Task 2: Enforce it in `onStartCommand` and unexport the service

### Checkpoint: Complete

- [x] `LocationReplyPolicyTest` passes
- [x] Manifest has `exported="false"` on `LocationRetrieverService`
- [x] Deny path cannot reach `Utils.sendSms` or `requestLocationUpdates`
- [x] Whitelisted `SmsReceiver` start still uses the existing GPS reply path

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deny path skips `startForeground` after `startForegroundService` | Process crash a few seconds later | `startForeground` then `stopForeground(true)` then `stopSelf()` before return |
| `createNotification` logs a refused request | One in-app log row, no SMS | Reuse the helper; title is the existing unlisted string, not "waiting for GPS" |
| `startForeground` notification id must be non-zero | Throws if id is 0 | Use `startId` when it is non-zero, otherwise a fixed non-zero id |
| Null `intent` (system restart) | NPE on `getStringExtra` | Treat null intent as deny |

## Open Questions

None. Scope is confirmed as-is: both `LocationRetrieverService` fixes, and `GeoLocationForegroundService` stays a separate review.
