# Swift offline map file server (PoC)

Proof of concept: embed a **Swift** HTTP static file server on Android so MapLibre can load offline map tiles from app storage (same idea as the removed `capacitor-nodejs` + Express static server on `localhost:4000`).

## Map / pack contract (locked)

- **On device / in app:** plain **static file tree** — `style.json` + tiles/sprites/glyphs as normal HTTP paths. MapLibre keeps using ordinary style URLs (online or `http://127.0.0.1:…`). **No client-side PMTiles**, no `pmtiles://` protocol, no MapLibre style changes for archives.
- **If PMTiles exists upstream:** decode/cache **on the pack/build server** into that static tree before download. The phone only ever sees files + a static HTTP server.
- Rationale: switching the app to PMTiles would add unwanted complexity in map/style; keep MapLibre dumb and styles unchanged.

## Chosen stack

- **HTTP / files:** [Vapor](https://vapor.codes/) + [`FileMiddleware`](https://docs.vapor.codes/advanced/middleware/#file-middleware) (most common Swift static-file API)
- **Fallback if Vapor won’t cross-compile:** Hummingbird + `FileMiddleware`
- **Android:** Swift SDK for Android → shared library (`.so`)
- **Bridge:** swift-java / JNI → Capacitor plugin (Java) → Vue/JS
- **Bind:** `127.0.0.1` only (never LAN)
- **Not in PoC v1:** reimplement download/extract in Swift — JS/native can place files; Swift only serves them

## Do we need the Swift Android SDK?

**Yes — if Swift runs on the phone.** The PoC embeds a Swift server *inside* the Android process, so you need:

1. **Swift SDK for Android** (+ NDK) — to *cross-compile* Swift → `arm64-v8a` `.so` (and Swift runtime libs). Without this, Vapor cannot run on device.
2. **swift-java / JNI** — so the existing Java Capacitor plugin can `start`/`stop` the Swift listener.
3. **Ordinary Android Java** only for the thin Capacitor plugin shell (and cleartext network-security config). You do **not** use Android’s Java HTTP stack (`HttpURLConnection` server, NanoHTTPD, etc.) for serving tiles — **Vapor/NIO owns sockets**.

You do **not** need the Swift Android SDK if you drop the Swift-on-device goal and pick a non-Swift path (Java HTTP or `convertFileSrc`). Desktop-only Vapor also skips it, but that is not this PoC.

```mermaid
flowchart LR
  MapLibre[MapLibre in WebView] -->|http://127.0.0.1:port| Plugin[Capacitor plugin]
  Plugin -->|JNI| SwiftSo[Swift .so]
  SwiftSo --> VaporMW[Vapor FileMiddleware]
  VaporMW --> Disk[map files on disk]
```

## Stages

### Stage 0 — Toolchain + standalone server

**Done when:** Vapor (or Hummingbird fallback) cross-compiles for `arm64-v8a` Android and serves a fixture `Public/` directory.

**Status (2026-08-07): complete** — package at [`native/OfflineMapServer`](../native/OfflineMapServer). Host smoke OK; `aarch64-unknown-linux-android28` release binary builds with Vapor (Hummingbird fallback not needed). Toolchain: Swift 6.3.3 + Android SDK + NDK r27d. Note: static binary ~175 MB — Stage 1 should prefer a shared library / smaller link for APK size.

- Install Swift toolchain, Android Swift SDK, NDK (per Swift.org Android getting started).
- New SPM package: Vapor app with:
  - `FileMiddleware(publicDirectory: …)`
  - `GET /healthy` → JSON `{ ts }`
  - listen on `127.0.0.1:<port>`
- Fixture tree: tiny `style.json` + one dummy asset under `Public/`.
- Gate: if Vapor fails Android build → switch to Hummingbird before Stage 1.

### Stage 1 — Embed in SMSLoc Android app

**Done when:** Dev UI can start/stop the server; HTTP GET to loopback returns fixture files.

**Status (2026-08-07): plugin + packaging script ready** — Capacitor plugin + Dev panel; cleartext for `127.0.0.1`; `scripts/package-android-jni.sh` produces `jniLibs/arm64-v8a` (~112 MB Core `.so`, gitignored). **Device smoke still needed** (Dev → Start → `curl`/WebView GET `/healthy`).

- Build `libOfflineMapServer.so` (+ Swift runtime libs) into `android` `jniLibs` / Gradle.
- Capacitor plugin (same pattern as existing plugins in `MainActivity`):
  - `start({ rootDir, port })`
  - `stop()`
  - `getBaseUrl()`
  - `isAvailable()`
- Network security: cleartext allowed **only** for `127.0.0.1` (Capacitor uses `androidScheme: https`).
- Dev panel button to start/stop (no full OfflineMaps product UI yet).
- TS: [`src/plugins/offlineMapServer`](../src/plugins/offlineMapServer/index.ts); Java: `si.stenar.smsloc.plugins.OfflineMapServer`.

### Stage 2 — MapLibre offline smoke

**Done when:** airplane mode + started server → basemap tiles visible.

**Status (2026-08-07): wiring ready — device smoke pending**

- Fixture style at `/styles/fixture/style.json` + local `data.geojson` (green polygon near Ljubljana) — proves multi-file FileMiddleware without a full `map.tar.gz`.
- Vapor `CORSMiddleware` so Capacitor `https://localhost` can fetch loopback.
- `config.LOCAL_MAPS_STYLE` + Dev panel **Use on map** sets `styleUrlOverride` on the base-layer store; **Stop** clears it (online styles remain default).
- Device check: Dev → Start (smoke fetch) → Use on map → Map tab → pan to ~14.5, 46.07 → airplane mode still paints blue + green. Optional later: point `rootDir` at a real style+tiles tree.

- Point `rootDir` at a minimal real map tree (subset of former `map.tar.gz` layout if available).
- Dev/config offline style URL → `http://127.0.0.1:<port>/…/style.json` (mirror old `LOCAL_MAPS_STYLE`).
- Open map tab; confirm style, tiles, sprites, glyphs resolve.
- Leave production `maptiles.stenar.si` as default when server not running.

### Stage 3 — Tests + go/no-go

**Done when:** tests below pass on one arm64 device and a short decision note exists.

**Status (2026-08-08): complete — product choice: Swift**

**Automated**

- Swift: fixture path → 200; missing → 404; path traversal (`..`) rejected.
  - `cd native/OfflineMapServer && swift test --filter OfflineMapServerCoreTests` — 4/4 pass.
- Android instrumented: start → GET `/healthy` + `style.json` → 200; not reachable via device LAN IP; stop → GET fails; no double-bind on recreate.
  - `./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=si.stenar.smsloc.plugins.OfflineMapServer.OfflineMapServerInstrumentedTest` — pass on Pixel 10a (API 17 / Android 17).

**Manual**

- Airplane mode basemap paints — Stage 2 Dev → Use on map (fixture).
- Start/stop from Dev panel without ANR — covered by instrumented stop/restart + Dev panel.
- Record APK size delta vs current master — see decision below.

**Product decision (2026-08-08): go with Swift (E)**

Accepted tradeoff for a shared Android/iOS static-file server and the same `http://127.0.0.1` MapLibre URL shape as the old Node path. NanoHTTPD / `convertFileSrc` are fallbacks only if size becomes a hard F-Droid blocker later.

| Metric | Value |
|--------|------:|
| Debug APK (with Swift PoC) | ~114 MB compressed / 136 MB on disk listing |
| Swift/Vapor native pack in APK | **~87 MB** (mostly `lib_FoundationICU` ~38 MB + Core ~25 MB) |
| APK without that pack (approx) | **~26 MB** |
| Delta attributable to Swift PoC | **~+87 MB** (accepted for now) |

**ICU (2026-08-08):** still required — Core links `FoundationInternationalization` → `_FoundationICU` (~38 MB). No safe omit in current package script.

**Product plan:** [`docs/plans/offline-maps/PLAN-swift-product.md`](../plans/offline-maps/PLAN-swift-product.md)

Do **not** restore `capacitor-nodejs` solely for static files.

## Out of scope (this PoC)

- Full OfflineMaps download/progress/remove UX (fixture on device is enough).
- Contours / DEM offline.
- Restoring `capacitor-nodejs`.
- **Client-side PMTiles / MapLibre `pmtiles` protocol** — pack server may use PMTiles internally; app does not.
- F-Droid release of Swift runtime without an explicit go decision after Stage 3.

## iOS later (why Swift PoC can matter)

| Approach | Android | iOS later |
|----------|---------|-----------|
| **A. Java NanoHTTPD (etc.)** | Works | **Must rewrite** — no Java on iOS; new Swift/ObjC plugin (or drop HTTP) |
| **E. Swift Vapor `FileMiddleware`** | Needs Swift Android SDK | **Same Swift server package** can target iOS with much less rewrite (JNI → Capacitor iOS bridge only) |
| **B. No local HTTP** (`convertFileSrc` / asset loader) | Works | **Mostly shared JS**; least native churn |

Android Java server is fine for Android-only, but it is throwaway for iOS. Swift-on-device is heavier now, but can share the file server with a future iOS app. `convertFileSrc` shares the most without embedding any HTTP server on either OS. All paths still serve/read a **static style+tiles tree**.

## Risks to track

- Swift Android SDK still preview-ish; reproducible F-Droid builds may hurt.
- APK bloat from Swift runtime vs NanoHTTPD.
- Must not break background SMS / `useLegacyBridge` native paths.
