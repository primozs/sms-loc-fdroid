/** Relative to OfflineMapServer rootDir (`filesDir/offline-map`). */
export const OFFLINE_MAP_DIR = 'offline-map';
export const OFFLINE_PACK_STYLE_PATH = 'map/styles/planet-small/style.json';

/** Pure probe used by unit tests; native `getPackStatus` is source of truth on device. */
export const isOfflineMapPackTree = (exists: (relPath: string) => boolean) =>
  exists(OFFLINE_PACK_STYLE_PATH) &&
  exists('map/tiles') &&
  exists('map/fonts');

export const offlinePackStyleUrl = (baseUrl: string): string =>
  `${baseUrl.replace(/\/$/, '')}/${OFFLINE_PACK_STYLE_PATH}`;
