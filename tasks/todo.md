# Tasks: LocationRetrieverService whitelist bypass

## Task 1: LocationReplyPolicy allow/deny

**Description:** Add a package-private pure check that a destination may receive a `Loc:` reply, and a JUnit test that fails before the class exists. Exact match on `ContactData.address`. Null address, empty address, null contact list, and an unknown number are denials.

**Acceptance criteria:**

- [x] `mayReply` returns true only when `address` is non-empty and equals some contact's `address`
- [x] Null address, `""`, null list, and a non-matching number return false
- [x] A differently formatted number (not equal to the stored string) returns false

**Verification:**

- [x] RED: `./android/gradlew :app:testDebugUnitTest --tests si.stenar.smsloc.core.LocationReplyPolicyTest` fails because the class is missing
- [x] GREEN: the same command passes
- [x] No new dependency

**Dependencies:** None

**Files likely touched:**

- `android/app/src/main/java/si/stenar/smsloc/core/LocationReplyPolicy.java`
- `android/app/src/test/java/si/stenar/smsloc/core/LocationReplyPolicyTest.java`

**Estimated scope:** Small (2 files)

## Task 2: Enforce the gate and unexport the service

**Description:** `LocationRetrieverService.onStartCommand` loads contacts only to call `mayReply`. On deny it does not register a location listener and does not send SMS; it satisfies the foreground-service contract, removes that notification, and `stopSelf()`. Set `android:exported="false"` on the service. Leave `SmsReceiver` unchanged.

**Acceptance criteria:**

- [x] `AndroidManifest.xml` sets `android:exported="false"` on `si.stenar.smsloc.core.LocationRetrieverService`
- [x] Null intent, missing `address`, empty `address`, or a number that fails `mayReply` returns `START_NOT_STICKY` without `requestLocationUpdates` or `Utils.sendSms`
- [x] Deny calls `startForeground`, then `stopForeground(true)`, then `stopSelf()`
- [x] A matching address still builds the "request from {name}" notification and runs the existing GPS reply path
- [x] `mAddress.equals` is not called when `address` is null

**Verification:**

- [x] `./android/gradlew :app:testDebugUnitTest --tests si.stenar.smsloc.core.LocationReplyPolicyTest` still passes
- [x] Manifest diff shows `exported="false"` for this service only
- [x] Read `onStartCommand`: deny returns before `startGpsUpdates` and before `taskFinished`

**Dependencies:** Task 1

**Files likely touched:**

- `android/app/src/main/java/si/stenar/smsloc/core/LocationRetrieverService.java`
- `android/app/src/main/AndroidManifest.xml`

**Estimated scope:** Small (2 files)

## Checkpoint: After Tasks 1-2

- [x] Policy unit test passes
- [x] Service is not exported
- [x] Deny path sends no SMS and starts no GPS updates
- [x] Whitelisted path is the existing reply flow
- [x] No JS, wire-format, or `SmsReceiver` edits
