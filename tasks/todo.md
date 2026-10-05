# Tasks: Own Contacts picker; drop WRITE_CONTACTS

## Task 1: Native + TS Contacts plugin

**Description:** Add first-party `Contacts` plugin: Android `ContactsPlugin` with `pickContact` (ACTION_PICK + read name/phones/image per projection) and Capacitor permissions alias `contacts` = `READ_CONTACTS` only; TS `src/plugins/contacts` definitions + `registerPlugin`. Do **not** register in MainActivity or remove the community package yet (avoids Cap name clash mid-task).

**Acceptance criteria:**
- [x] `si.stenar.smsloc.plugins.Contacts.ContactsPlugin` exists with READ-only `@Permission`
- [x] Methods: `pickContact`, plus standard check/request permissions behavior for alias `contacts`
- [x] `src/plugins/contacts/` exports typed `Contacts` plugin
- [x] No `WRITE_CONTACTS` in the new plugin annotation
- [x] No create/delete/list APIs

**Verification:**
- [x] `rg 'WRITE_CONTACTS' android/app/src/main/java/si/stenar/smsloc/plugins/Contacts` → no matches
- [x] `cd android && JAVA_HOME=$(mise where java@21) ./gradlew :app:compileDebugJavaWithJavac` succeeds

**Dependencies:** None

**Files likely touched:**
- `android/app/src/main/java/si/stenar/smsloc/plugins/Contacts/ContactsPlugin.java` (new; helpers OK if tiny)
- `src/plugins/contacts/definitions.ts` (new)
- `src/plugins/contacts/index.ts` (new)

**Estimated scope:** Medium (3–5 files)

---

## Task 2: Cut over call sites; drop WRITE + community package

**Description:** Register the new plugin in `MainActivity`; switch `AddContact.vue`, `usePermissions.ts`, and `contacts.ts` to `@/plugins/contacts` and a local picked-contact type; remove `WRITE_CONTACTS` from `AndroidManifest.xml`; remove `@capacitor-community/contacts` from `package.json` and refresh lockfile; sync Capacitor plugin list.

**Acceptance criteria:**
- [x] `MainActivity` registers `ContactsPlugin`
- [x] No imports of `@capacitor-community/contacts` under `src/`
- [x] `WRITE_CONTACTS` removed from app manifest and absent from merged debug manifest
- [x] Dependency removed from `package.json` / yarn.lock
- [x] Add Contact + contacts permission flow still compile against the new API

**Verification:**
- [x] `rg 'WRITE_CONTACTS|@capacitor-community/contacts' android/app/src src package.json` → no matches
- [x] `yarn type-check` (pre-existing offline-map config typing errors only; no contacts errors)
- [x] `cd android && JAVA_HOME=$(mise where java@21) ./gradlew :app:assembleDebug`
- [ ] Manual (optional): pick contact → whitelist row; app permissions show contacts read only

**Dependencies:** Task 1

**Files likely touched:**
- `android/app/src/main/java/si/stenar/smsloc/MainActivity.java`
- `android/app/src/main/AndroidManifest.xml`
- `src/views/contacts/AddContact.vue`
- `src/services/usePermissions.ts`
- `src/services/contacts.ts`
- `package.json`, `yarn.lock`
- `android/app/src/main/assets/capacitor.plugins.json` (via sync)

**Estimated scope:** Medium (3–5 files + lockfile)

---

## Checkpoint: Complete

- [x] Spec success criteria satisfied
- [x] Ready for human review / device smoke / commit when asked
