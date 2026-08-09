# SMSLocFD - Agent Quick Reference

Offline SMS location sharing for outdoor use (hiking, climbing, paragliding, etc.). Whitelisted contacts can request each other's GPS via SMS when there is little or no internet. App ID: `si.stenar.smsloc`. Package manager: **yarn**.

## Tech Stack

- Vue 3 + TypeScript + Vite 8
- Ionic Vue 8 (UI + router)
- Capacitor 8 (Android only in this repo)
- Ionic CSS + `src/theme/variables.css` (class dark palette)
- Pinia + TanStack Vue Query
- vue-i18n (locales: `en`, `sl`)
- Maps: MapLibre GL
- Offline maps: Swift Vapor static file server (`native/OfflineMapServer`) via Capacitor/JNI — **not** `capacitor-nodejs`
- Local SQLite via `@capacitor-community/sqlite`
- System UI: `@capacitor/status-bar`, `@capawesome/capacitor-navigation-bar`, `@capawesome/capacitor-android-edge-to-edge-support`
- Lint/format: ESLint + Prettier (not Biome)
- Unit: Vitest 4 · E2E: Cypress

## Key Commands

```bash
yarn install

# UI / web dev (runs configure:dev first)
yarn ionic-serve

# Type-check / lint / format
yarn type-check
yarn lint
yarn fmt
yarn fmt.check

# Unit / e2e
yarn test:unit
yarn test:e2e

# Offline map Swift natives (gitignored jniLibs; needed before device run)
# F-Droid rebuilds the Android Swift runtime from source first:
#   ./scripts/build-swift-android-sdk.sh   # or full: ./scripts/fdroid-prebuild.sh
./native/OfflineMapServer/scripts/package-android-jni.sh

# Sync web into Capacitor Android
yarn ionic-sync
yarn ionic-capacitor-open-android
yarn ionic-capacitor-run-android
yarn ionic-live-reload   # needs ionic-serve + adb port forward to :8100

# Release build (Docker)
yarn docker:build
yarn docker:generate:keystore
yarn docker:compile
```

Config: copy `config/dev/index.example.ts` → `config/dev/index.ts` (and prod). Those files are gitignored; `src/config.ts` is also gitignored in some setups — prefer editing via `configure:dev` / `configure:prod` scripts.

## Project Structure

```
src/
  main.ts                 # Bootstrap: Ionic, i18n, Pinia, Vue Query, SQLite
  App.vue / useApp.ts     # Root shell
  config.ts               # Runtime config (maps URLs, DB name, version) — often gitignored
  router/                 # Ionic Vue Router (/contacts, /map, /settings, …)
  views/                  # Pages: contacts, map, settings, logs, presentation, dev
  components/             # Shared UI
  services/               # SQLite access, contacts/requests/responses, permissions, logger
  plugins/                # Capacitor plugin TS bindings (sms, geolocation, locale, core, offlineMapServer)
  map/                    # MapLibre map setup and layers
  locales/                # i18n messages
  theme/                  # Ionic CSS variables (light + ion-palette-dark)
native/OfflineMapServer/  # Swift Vapor static server + JNI package script
android/app/src/main/java/si/stenar/smsloc/
  MainActivity.java       # Registers native plugins
  core/                   # SMS receive/respond, location service, permissions bridge
  plugins/                # Sms, GeoLocation, Locale, OfflineMapServer Capacitor plugins
  data/                   # SQLite stores (contacts, requests, responses, logs, GpsData)
config/                   # Trapeze + env configure scripts (dev/prod)
deploy/docker/            # Clean-room APK/AAB compile
```

## Architecture (what matters)

### Dual runtime: JS UI + native Android

- Foreground UX is Vue/Ionic in the WebView.
- Hands-free SMS location replies run in **native** code (`core/SmsReceiver`, `LocationRetrieverService`) so responses work when the UI is backgrounded or killed.
- Capacitor plugins bridge permissions, SMS watch/send, geolocation, and locale into JS.

Registered native plugins (`MainActivity`): `LocalePlugin`, `SmsPlugin`, `GeoLocationPlugin`, `CorePlugin`, `OfflineMapServerPlugin`.

### Offline maps (Swift)

- Static file tree under `filesDir/offline-map/map/` (`styles/planet-small/style.json` + `tiles` + `fonts`).
- Settings downloads `OFFLINE_MAP_DOWNLOAD_URL` (`map.tar.gz`); Java extracts; Swift serves `127.0.0.1` only.
- MapLibre uses `LOCAL_MAPS_STYLE` when offline + pack installed; otherwise stenar base layers.
- Package natives: `./native/OfflineMapServer/scripts/package-android-jni.sh` → gitignored `jniLibs/arm64-v8a` (~**100 MB** unstripped from-source runtime, mostly `lib_FoundationICU`).
- F-Droid: `scripts/fdroid-prebuild.sh` rebuilds the Swift Android SDK from source (`scripts/build-swift-android-sdk.sh`); do not install the download.swift.org prebuilt SDK in that path. Optional GHCR image is for local/CI only.
- Do **not** restore `capacitor-nodejs` for static files. No client PMTiles.
- Plans: `docs/offline-map-swift-poc.md`, `docs/plans/offline-maps/PLAN-swift-product.md`.

### SMS protocol

Defined in `android/.../core/Constants.java`:

| Prefix | Meaning |
|--------|---------|
| `Loc?` | Location **request** |
| `Loc:` | Location **response** |

Response body after `Loc:` is CSV GPS (`GpsData`):  
`lat,lon,alt_m,ts_s,v_kmh,acc_m,bat_p[,message]`

Only **whitelisted** contacts (SQLite contact store) get a GPS reply; others get a localized “not whitelisted” SMS.

Keep JS and Java parsing of this format in sync when changing the wire format.

### Data

- SQLite DB name: `smsloc` (see `config.DB_NAME`)
- Native stores under `android/.../data/`; JS access via `src/services/*` + `@capacitor-community/sqlite`
- Contacts, requests, responses, and logs are the core domain tables

### Android SDK

- `minSdkVersion` 29, `compileSdkVersion` / `targetSdkVersion` **36** (`android/variables.gradle`)
- AGP 8.13.0, Gradle wrapper 8.14.3
- Version: keep `package.json` version and `android/app/build.gradle` `versionName` aligned
- ABI filter currently `arm64-v8a`; resource configs `en`, `sl`
- Prefer **no Google Play Services** dependency for F-Droid builds (see geolocation plugin readme)
- Cap 8 upgrade guide: https://capacitorjs.com/docs/updating/8-0 (`yarn cap migrate`)

## Conventions

- Prefer Composition API + `<script setup>` in Vue SFCs
- Path alias `@/` → `src/`
- Prettier: 2 spaces, single quotes, trailing commas, printWidth 80
- ESLint: Vue 3 essential + `@vue/typescript/recommended`; several strict rules intentionally off (`no-explicit-any`, multi-word names, etc.)
- Services that hit SQLite/native should stay thin; UI data loading prefers Vue Query hooks (`useContactsData`, `useLogsData`, …)
- When changing a Capacitor plugin API, update **both** `src/plugins/<name>/` and the matching Java under `android/.../plugins/` (or `core/`)

## Boundaries

- Do not commit secrets, keystores, or `keystores/` passwords
- Do not commit generated `config/dev/index.ts` or `config/prod/index.ts`
- Do not commit `android/app/src/main/jniLibs/` (Swift runtime — regenerate via package script)
- Do not add Google Play Services / GMS-only APIs without an explicit F-Droid-compatible alternative
- Do not restore `capacitor-nodejs` solely for offline map static files
- Ask before changing the SMS wire format (`Loc?` / `Loc:` / `GpsData` CSV) — it is a cross-device protocol
- Ask before bumping Capacitor major, `minSdk`, or `targetSdk`
- Treat git as read-only unless the user explicitly asks to commit, push, or open a PR

## Common Gotchas

1. **Config files are gitignored** — missing `config/*/index.ts` or `src/config.ts` breaks builds; use examples + `yarn configure:dev|prod`
2. **Must `ionic-sync` after web changes** before expecting them on device
3. **OfflineMapServer `.so` missing** — run `package-android-jni.sh` (Swift 6.3.3 + Android SDK); adds ~87 MB to APK
4. **Native SMS path ≠ JS SMS path** — background replies go through Java `SmsReceiver`; UI send/watch uses the Capacitor Sms plugin
5. **Battery optimization** — `MainActivity` may prompt to ignore battery optimizations for reliable background location
6. **Phone numbers** — native code normalizes to E.164 via libphonenumber; contact matching depends on that
7. **Live reload** — serve on :8100, `adb` port-forward, then `yarn ionic-live-reload`
8. **Docker release** — signing password file `keystores/password`; see `deploy/docker/README.md`
9. **F-Droid** — unsigned build: `yarn fdroid-build` / [`docs/fdroid.md`](docs/fdroid.md); metadata draft in `docs/fdroid/metadata/`

## Git protocol

This section is the canonical git rules for agents working in this repo.

### Default posture

- Treat git as **read-only** unless the user explicitly asks to commit, push, pull, or open a PR
- Never auto-commit, even when work is complete
- Never update `git config`
- Never skip hooks (`--no-verify`, `--no-gpg-sign`) unless the user explicitly requests it

### Forbidden (without explicit user request)

- `git reset`, `git revert`, `git rebase`, `git cherry-pick`
- `git commit`, `git push`, `git pull`
- `git branch -D`, `git tag -d`, force-push to `main`/`master`
- `git stash`, `git clean`, `git checkout .` (destructive to working tree)
- `git add -A` / `git add .` — stage only paths changed in the current session

### Allowed read-only

- `git status`, `git diff`, `git log`, `git show`, `git branch`, `git merge-base`, `git grep`

### Branches

- Work only on the **currently checked-out** branch
- **Never** create, switch, or delete branches
- If on `main`/`master` and the change is non-trivial, stop and suggest the user create a feature branch — do not create it

### When the user asks to commit

1. Run in parallel: `git status`, `git diff` (staged + unstaged), `git log -10` (match message style)
2. Stage **explicit paths only** (`git add <path>…`) — never `git add -A`
3. Do not stage secrets (`.env`, keystores, credentials)
4. Draft a short message focused on **why**; pass via HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
Short summary.

Optional body explaining why.
EOF
)"
```

5. **Amend** only when ALL are true: user requested amend, HEAD was created by this agent in this conversation, commit not pushed, commit did not fail a hook
6. If a pre-commit hook modifies files: fix and create a **new** commit — never amend a failed/rejected commit
7. Do **not** push unless the user also asks

**Message style:** match repo history (short version bumps and feature notes — e.g. `0.0.12`, `location plugins update 0.0.12`, `more accurate position, upgrade deps v0.0.10`).

**Pre-commit checks** (when code changed):

```bash
yarn lint
yarn type-check
yarn test:unit   # when logic/tests touched
```

### When the user asks to open a PR

1. Run in parallel: `git status`, `git diff` vs base branch, `git log`, remote tracking check
2. Push with `git push -u origin HEAD` only if needed and the user asked
3. Create PR via `gh pr create` with HEREDOC body (Summary + Test plan)
4. Return the PR URL

### Commit discipline

- One logical change per commit; don't mix refactors with features
- Don't mix formatting-only changes with behavior changes
- Never commit `node_modules/`, `dist/`, keystores, or build artifacts

## Agent workflow

Before implementing anything non-trivial:

1. Check if an agent skill applies
2. Read the full `SKILL.md` for that skill before starting
3. State assumptions if requirements are ambiguous
4. Keep scope minimal; verify with lint/type-check (and device sync when touching native/plugins) before claiming done

### Skill quick map

- **New feature** → `spec-driven-development` → `incremental-implementation` → `test-driven-development`
- **Planning** → `planning-and-task-breakdown`
- **Bug fix** → `debugging-and-error-recovery` → `test-driven-development`
- **UI work** → `frontend-ui-engineering`
- **Native / Capacitor** → treat Java + TS plugin defs as one change set
- **Code review** → `code-review-and-quality`
- **Refactoring** → `code-simplification`
- **Ship / release** → `shipping-and-launch` + `deploy/docker/README.md`

Phases: **DEFINE** → **PLAN** → **BUILD** → **VERIFY** → **REVIEW** → **SHIP**

### Project docs

- App overview / dev flow: `README.md`
- Docker release: `deploy/docker/README.md`
- Geolocation native notes: `src/plugins/geolocation/readme.md`
- Offline map Swift PoC: `docs/offline-map-swift-poc.md`
- Offline map product plan: `docs/plans/offline-maps/PLAN-swift-product.md`
