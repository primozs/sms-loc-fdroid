# Implementation Plan: Own Contacts picker; drop WRITE_CONTACTS

## Overview

Replace `@capacitor-community/contacts` with a first-party Capacitor plugin that only implements `pickContact` plus `READ_CONTACTS` check/request. Remove `WRITE_CONTACTS` from the app manifest and delete the community dependency. Keep Add Contact and permission-setup UX.

## Architecture Decisions

- **Own plugin, not patch-package.** Avoids fighting the community alias that bundles WRITE.
- **Capacitor name `Contacts`.** Matches current call-site familiarity; cut over in one step so the community plugin is gone before/at registration (no dual registration under the same name).
- **READ only.** `@Permission(strings = { READ_CONTACTS }, alias = "contacts")`. No create/delete/list APIs.
- **Return shape compatible with today’s `ContactStore.addContact`.** Prefer a local `PickedContact` type over importing `ContactPayload`.
- **Mirror Sms/Locale patterns.** Thin Java plugin + `src/plugins/contacts/` registerPlugin; web unimplemented/reject.

## Dependency Graph

```
ContactsPlugin.java (pick + READ perms)
        │
        ├── MainActivity.registerPlugin
        │
src/plugins/contacts (TS API)
        │
        ├── AddContact.vue
        ├── usePermissions.ts
        └── contacts.ts (local type)
                │
                └── remove @capacitor-community/contacts + WRITE_CONTACTS
```

Build order: native plugin → TS bindings → cut over consumers → remove dep/permission → verify.

## Task List

### Phase 1: Plugin

- [x] Task 1: Native + TS Contacts plugin (`tasks/todo.md`)

### Checkpoint: Plugin skeleton

- [x] New Java/TS plugin files exist; annotation is READ-only
- [x] App still builds (community package may still be present until Task 2)

### Phase 2: Cutover

- [x] Task 2: Wire call sites, drop WRITE + community package

### Checkpoint: Complete

- [x] Grep clean for WRITE_CONTACTS and @capacitor-community/contacts
- [x] type-check + assembleDebug
- [x] Human review / device smoke (pick + permissions)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual `Contacts` Cap name if community left installed + own registered | High | Remove community dep and register own plugin in the same cutover task |
| Picker URI / phone-type mapping differs from community | Med | Match fields `addContact` needs; reject with `CONTACT_NOT_VALID` when no mobile/name |
| Image base64 encoding edge cases | Low | Optional projection; null image OK |
| Capacitor sync still lists old plugin | Med | `yarn ionic-sync` / regenerate `capacitor.plugins.json` after dep removal |

## Open Questions

None — using SPEC assumptions (name `Contacts`, compatible pick shape, Android-only, no patch-package).
