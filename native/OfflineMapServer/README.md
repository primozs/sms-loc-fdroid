# OfflineMapServer (Swift PoC)

Vapor + `FileMiddleware` static file server for offline map tiles.
Plan: [`docs/offline-map-swift-poc.md`](../../docs/offline-map-swift-poc.md).

Requires **Swift 6.3.3** (see repo `.swift-version`) matching the Android Swift SDK.

## Stage 0 status

- [x] Host build + smoke (`/healthy`, fixture `style.json`)
- [x] Android Swift SDK 6.3.3 + NDK r27d configured
- [x] `aarch64-unknown-linux-android28` release binary builds (~175 MB with `--static-swift-stdlib`)

## Host run

```sh
cd native/OfflineMapServer
swift build
OFFLINE_MAP_ROOT="$PWD/Public" OFFLINE_MAP_PORT=4000 \
  .build/debug/OfflineMapServer
```

```sh
curl -s http://127.0.0.1:4000/healthy
curl -s http://127.0.0.1:4000/styles/fixture/style.json
```

| Variable | Default | Meaning |
|----------|---------|---------|
| `OFFLINE_MAP_ROOT` | `./Public` | Directory to serve |
| `OFFLINE_MAP_HOST` | `127.0.0.1` | Bind address (loopback only) |
| `OFFLINE_MAP_PORT` | `4000` | Port |

## Android cross-compile

One-time toolchain (host):

```sh
swiftly install 6.3.3 && swiftly use 6.3.3
swift sdk install \
  https://download.swift.org/swift-6.3.3-release/android-sdk/swift-6.3.3-RELEASE/swift-6.3.3-RELEASE_android.artifactbundle.tar.gz \
  --checksum d160cc3206dd1886dae3fef2337af5e25ec034692cd0ec225721c56cc69da7f5
# NDK r27d + setup-android-sdk.sh — see Swift.org Android getting started
```

Build:

```sh
cd native/OfflineMapServer
swift build -c release \
  --swift-sdk aarch64-unknown-linux-android28 \
  --static-swift-stdlib
file .build/aarch64-unknown-linux-android28/release/OfflineMapServer
```

## Stage 1 (app embed)

- Library target `OfflineMapServerCore` with C ABI: `offline_map_server_start|stop|base_url`.
- JNI shim: [`jni/offline_map_jni.c`](jni/offline_map_jni.c).
- Capacitor plugin registered in `MainActivity`; Dev → OfflineMapServer panel.
- Package into APK:

```sh
./native/OfflineMapServer/scripts/package-android-jni.sh
# then yarn ionic-sync / run android
```

The script copies only **transitive `NEEDED`** libs from the Swift Android runtime (not all `lib*.so`), then `llvm-strip`s. The JNI shim is linked with `-Wl,-z,max-page-size=16384` for Android 16 KB page-size compatibility. Output is gitignored under `android/app/src/main/jniLibs/`.

Until `jniLibs` are filled, `OfflineMapServer.isAvailable()` returns false with a clear load error.

## Stage 2 (MapLibre smoke)

- Fixture: `Public/styles/fixture/{style.json,data.geojson}` (background + GeoJSON fill).
- Server sends CORS (`Access-Control-Allow-Origin`) for Capacitor HTTPS WebView.
- Dev → OfflineMapServer → **Start** (HTTP smoke) → **Use on map** → open Map tab near Ljubljana (`14.525, 46.075`).
- **Stop** clears the map style override (back to `maptiles.stenar.si`).

## Stage 3 (tests)

```sh
cd native/OfflineMapServer && swift test --filter OfflineMapServerCoreTests

# device (jniLibs packaged first)
./native/OfflineMapServer/scripts/package-android-jni.sh
cd android && ./gradlew :app:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=si.stenar.smsloc.plugins.OfflineMapServer.OfflineMapServerInstrumentedTest
```

Go/no-go: see [`docs/offline-map-swift-poc.md`](../../docs/offline-map-swift-poc.md) Stage 3 — **product choice: Swift** (~+87 MB accepted for shared Android/iOS server).

## APK size (2026-08-08)

| Piece | Size |
|-------|-----:|
| All packaged `jniLibs` (stripped) | **~87 MB** |
| `lib_FoundationICU.so` | ~38 MB (44%) |
| `libOfflineMapServerCore.so` | ~25 MB |
| Rest (Foundation, swiftCore, …) | ~24 MB |

**ICU trim:** not viable with the current link. `libOfflineMapServerCore.so` **NEEDED**s `libFoundationInternationalization.so`, which **NEEDED**s `lib_FoundationICU.so`. Dropping ICU without a different Foundation/Vapor link would fail `dlopen`. Theoretical floor if ICU were unlinkable: ~49 MB. Accepted ceiling for F-Droid: document the ~+87 MB native delta in release notes.

Product plan: [`docs/plans/offline-maps/PLAN-swift-product.md`](../../docs/plans/offline-maps/PLAN-swift-product.md).

## On-device pack layout

```
filesDir/offline-map/          ← product rootDir (install / getPackStatus)
  map/
    styles/planet-small/style.json
    tiles/
    fonts/
  map.tar.gz                   ← temporary during download

filesDir/offline-map-fixture/  ← Dev panel start({ fixture: true }) only
  styles/fixture/style.json
  styles/fixture/data.geojson
```

Product URL: `http://127.0.0.1:4000/map/styles/planet-small/style.json` (`config.LOCAL_MAPS_STYLE`).  
Dev fixture URL: `http://127.0.0.1:4000/styles/fixture/style.json`.
