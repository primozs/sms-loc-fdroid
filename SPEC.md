# Spec: Own contact picker plugin; drop WRITE_CONTACTS + community contacts

## Objective

Remove `@capacitor-community/contacts` and implement a minimal **first-party** Capacitor plugin that only supports picking a contact (plus READ permission check/request). Drop `WRITE_CONTACTS` from the app. Keep the Add Contact UX working.

**Why:** The app never writes the address book. The community plugin forces `WRITE_CONTACTS` via its permission alias. Owning a thin picker plugin removes that permission without patching `node_modules`.

**Users:** SMSLocFD users adding whitelist contacts via the system picker.

## Tech Stack

- Existing pattern: `src/plugins/<name>/` + `android/.../plugins/<Name>/` + `MainActivity.registerPlugin`
- Android: `Intent.ACTION_PICK` + `ContactsContract`, `READ_CONTACTS` only
- Remove dependency `@capacitor-community/contacts` from `package.json` / yarn.lock

## Commands

```bash
yarn install          # after removing community package
yarn lint
yarn type-check
cd android && JAVA_HOME=$(mise where java@21) ./gradlew :app:assembleDebug
rg 'WRITE_CONTACTS|@capacitor-community/contacts' android/ src/ package.json
# expect: no matches (except maybe changelog/docs if any)
```

Manual: Add Contact → system picker → whitelist row (name + mobile + optional image).

## Project Structure

```
src/plugins/contacts/          → NEW TS defs + registerPlugin (name TBD, see assumptions)
android/.../plugins/Contacts/  → NEW ContactsPlugin.java (pick + READ perms only)
android/.../MainActivity.java  → register plugin
android/.../AndroidManifest.xml → remove WRITE_CONTACTS; keep READ_CONTACTS
src/views/contacts/AddContact.vue → use own plugin
src/services/usePermissions.ts    → use own plugin for contacts check/request
src/services/contacts.ts          → local picked-contact type (no ContactPayload import)
package.json                      → remove @capacitor-community/contacts
```

No `patch-package`.

## Code Style

Match Locale/Sms plugins: small `@CapacitorPlugin`, `@Permission` with **only** `READ_CONTACTS`, alias `contacts`.

Picker contract (minimum fields `ContactStore.addContact` needs today):

```ts
// picked contact shape for whitelist insert
{
  contactId: string;
  name?: { display?: string };
  phones?: { type?: string; number?: string }[];
  image?: { base64String?: string | null };
}
```

Plugin methods:

- `pickContact(options?: { projection?: { name?: boolean; phones?: boolean; image?: boolean } })`
- `checkPermissions()` / `requestPermissions()` → `{ contacts: PermissionState }`

Do not implement create/delete/list-all unless needed later.

## Testing Strategy

- Merged manifest: no `WRITE_CONTACTS`; `READ_CONTACTS` present
- Grep: no `@capacitor-community/contacts` in app sources / package.json
- `:app:assembleDebug` + `yarn type-check`
- Device: pick flow + permissions settings screen still drive contacts READ grant

## Boundaries

- **Always:** READ-only contacts permission; keep pick-based whitelist add; register plugin in MainActivity; remove community dependency cleanly
- **Ask first:** Broader contacts APIs (search, create); changing whitelist validation rules; iOS (repo is Android-focused)
- **Never:** Reintroduce `WRITE_CONTACTS`; call system contact write APIs; leave dead community plugin references

## Success Criteria

- [x] `@capacitor-community/contacts` removed from dependencies and imports
- [x] First-party plugin provides pickContact + READ permission APIs
- [x] `WRITE_CONTACTS` absent from app and merged manifests
- [x] Add Contact + permission setup still work on device (dismiss picker → no toast)
- [x] type-check / assembleDebug succeed (assembleDebug OK; type-check has pre-existing offline-map config gaps only)

## Open Questions / Assumptions

ASSUMPTIONS I’M MAKING (correct me before plan/build):

1. Plugin id/name: `Contacts` (same Cap name as before so call sites stay familiar), package `si.stenar.smsloc.plugins.Contacts`.
2. Return shape stays compatible with current `addContact` (mobile phone required, optional image base64).
3. Web stub: reject/unimplemented (same as other native-only plugins) — contacts flow is Android-only.
4. No `patch-package`; delete community package entirely.

→ Approve or adjust these, then we `/as-plan` / `/as-build`.
