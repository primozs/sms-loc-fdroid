# Implementation Plan: Swift offline maps (product)

## Overview

Productize the Stage 0–3 Swift PoC: serve a static map file tree from app storage over `http://127.0.0.1`, wire MapLibre to it when a pack is installed / network is down, restore download–extract–remove UX, and keep F-Droid impact documented. **No client PMTiles.** Swift only serves; JS/native places files.

## Architecture Decisions

- **Server:** keep `OfflineMapServer` (Vapor `FileMiddleware`) + Capacitor/JNI bridge.
- **On-disk layout** (match former Node/`map.tar.gz` contract):
  ```
  <filesDir>/offline-map/
    map/
      styles/planet-small/style.json
      tiles/…
      fonts/…
  ```
  Server `rootDir` = `<filesDir>/offline-map` so URLs stay  
  `http://127.0.0.1:4000/map/styles/planet-small/style.json`.
- **Installed check:** `map/styles/planet-small/style.json` + `map/tiles` + `map/fonts` dirs exist.
- **Style selection:** when pack installed **and** (server running + offline / user preference), MapLibre uses `config.LOCAL_MAPS_STYLE`; otherwise `maptiles.stenar.si` base layers.
- **Download:** JS downloads `OFFLINE_MAP_DOWNLOAD_URL` (`map.tar.gz`) into app files, extracts under `offline-map/` (Capacitor Filesystem or native helper — no Node).
- **Size:** ~+87 MB Swift runtime accepted; track ICU trim as optional hardening.
- **iOS:** later Capacitor bridge only; out of current Android phases.

## Dependency graph

```
Pack layout + path helpers
    │
    ├── Auto-start server + LOCAL_MAPS_STYLE wiring ──► Map offline smoke (real pack)
    │
    ├── Download / extract / remove (JS) ──► Settings OfflineMaps UI
    │
    ├── Airplane / network switch to local style
    │
    ├── Size trim (optional) + F-Droid notes
    │
    └── iOS bridge (later)
```

## Task List

### Phase A — Serve + style (no download yet)

- [x] **Task 1: Pack paths + installed probe + auto-start**
- [x] **Task 2: MapLibre uses LOCAL_MAPS_STYLE when pack live**
- [x] **Task 3: Network flip** (online → stenar styles; offline → local if installed)

### Checkpoint A

- [x] Code: pack probe, auto-start, LOCAL_MAPS_STYLE when offline, stenar when online (`@capacitor/network`).
- [ ] Device: manually placed `map/` under `filesDir/offline-map` → cold start serves style; airplane mode paints.
- [x] Unit tests for path/style helpers; type-check green.

### Phase B — Install UX

- [x] **Task 4: Download `map.tar.gz` to app storage** (progress events)
- [x] **Task 5: Extract + verify installed; remove pack**
- [x] **Task 6: Settings `OfflineMaps` UI** (install / progress / delete) + i18n
- [x] **Task 7: Config** (`OFFLINE_MAP_DOWNLOAD_URL`, `LOCAL_MAPS_STYLE`, `SERVER_PORT`) wired through configure scripts / examples

### Checkpoint B

- [ ] Settings → install pack → auto-start → map works in airplane mode → delete frees space. (device)

### Phase C — Hardening

- [x] **Task 8: APK size pass** — measured ~87 MB jniLibs; ICU (~38 MB) hard-NEEDED via FoundationInternationalization — no trim; ceiling documented
- [x] **Task 9: Release notes / AGENTS** — F-Droid size, package-jni, layout, no Node restore
- [x] **Task 10: Contours/DEM offline** — explicit non-goal (deferred)

### Phase D — Later (not started)

- [ ] **Task 11: iOS Capacitor bridge** for `OfflineMapServerCore`
- [ ] **Task 12: Pack pipeline** (PMTiles→static tree on build server only)

---

## Task 1: Pack paths + installed probe + auto-start

**Description:** Define on-disk roots and “installed” detection; on native app boot (or first map enter), if pack installed, `OfflineMapServer.start({ rootDir })` without writing the PoC fixture over a real pack.

**Acceptance criteria:**
- [ ] Helpers: `offlineMapRootDir`, `isOfflineMapInstalled(paths)`, style URL from config
- [ ] Start uses real root; empty/missing pack does **not** require fixture for product path
- [ ] Dev panel can still start fixture for PoC smoke
- [ ] Double-start safe (existing Swift idempotent start)

**Verification:**
- [ ] Unit tests for installed probe
- [ ] Device: place minimal tree → start → GET style 200

**Dependencies:** None  
**Files likely touched:** `src/plugins/offlineMapServer/*`, Java plugin (rootDir / no clobber), `src/main.ts` or small bootstrap, config examples

---

## Task 2: MapLibre uses LOCAL_MAPS_STYLE when pack live

**Description:** When server is running and pack installed, set `styleUrlOverride` to `LOCAL_MAPS_STYLE` (not fixture). Clear override when pack removed / server stopped.

**Acceptance criteria:**
- [ ] Map shows local style without Dev “Use on map”
- [ ] Production stenar URLs when override cleared
- [ ] Settings base-layer choice restored when back online (Task 3)

**Verification:** Manual map tab + unit test for override selection helper  
**Dependencies:** Task 1  
**Files:** `baseLayers.ts`, `MlMap.vue`, bootstrap / offline maps service

---

## Task 3: Network flip

**Description:** Restore former `watchNetwork` behavior: connected → selected base layer URL; disconnected → `LOCAL_MAPS_STYLE` if pack+server ready.

**Acceptance criteria:**
- [ ] Toggle airplane mode switches styles without restart
- [ ] No override if pack missing (map may fail offline — expected)

**Verification:** Manual airplane toggle  
**Dependencies:** Task 2  
**Files:** new or restored `watchNetwork` + map glue; `@capacitor/network` if still a dep

---

## Task 4: Download map.tar.gz

**Description:** Download `config.OFFLINE_MAP_DOWNLOAD_URL` into `offline-map/map.tar.gz` with progress (percent / bytes). Cancel supported.

**Acceptance criteria:**
- [ ] Progress callbacks for UI
- [ ] Failures surfaced; partial file cleaned or overwritten on retry

**Verification:** Dev/Settings install against known URL  
**Dependencies:** Task 1  
**Files:** `src/services/offlineMaps/*` (or similar); Capacitor Http / fetch + Filesystem

---

## Task 5: Extract + verify + remove

**Description:** Extract tarball so `map/styles|tiles|fonts` land under `offline-map/`; run installed probe; remove deletes `map/` (+ archive).

**Acceptance criteria:**
- [ ] `isOfflineMapInstalled` true after extract
- [ ] Remove makes probe false and stops server / clears style override

**Verification:** Install then remove on device  
**Dependencies:** Task 4  
**Files:** extract util (native or JS); offline maps service

---

## Task 6: Settings OfflineMaps UI

**Description:** Restore Settings row: status, progress bar, install / cancel / delete (pattern from removed `OfflineMaps.vue`).

**Acceptance criteria:**
- [ ] en/sl strings
- [ ] Wired to Tasks 4–5; starts server after successful install

**Verification:** Manual Settings flow  
**Dependencies:** Tasks 4–5  
**Files:** `OfflineMaps.vue`, `SettingsView.vue`, `messages.ts`

---

## Task 7: Config wiring

**Description:** `LOCAL_MAPS_STYLE`, `SERVER_PORT`, `OFFLINE_MAP_DOWNLOAD_URL` in examples + generated config; defaults point at production pack URL when known.

**Acceptance criteria:**
- [ ] `configure:dev|prod` examples document all three
- [ ] App reads them (no hardcoded PoC fixture URL for product path)

**Dependencies:** Tasks 1–2  
**Files:** `config/*/index.example.ts`, `src/config.ts`

---

## Task 8: APK size pass — done (2026-08-08)

| Piece | Size |
|-------|-----:|
| Packaged `jniLibs` | **~87 MB** |
| `lib_FoundationICU.so` | ~38 MB |
| `libOfflineMapServerCore.so` | ~25 MB |

**ICU:** Core → FoundationInternationalization → `_FoundationICU` (readelf NEEDED). Cannot omit without a different Swift/Foundation link. Theoretical without ICU: ~49 MB. **No trim shipped.**

## Task 9: Docs / AGENTS — done

Updated `AGENTS.md`, `native/OfflineMapServer/README.md`, this plan.

## Task 10–12

Deferred — contours/DEM (non-goal), iOS bridge, pack pipeline.

## Out of scope

- Restoring `capacitor-nodejs`
- Client-side PMTiles / `pmtiles://`
- Changing SMS `Loc?` / `Loc:` protocol
