/** Path under the OfflineMapServer root (see native Public/ + Java fixture). */
export const OFFLINE_FIXTURE_STYLE_PATH = '/styles/fixture/style.json';

/** MapLibre center that shows the fixture polygon (Ljubljana area). */
export const OFFLINE_FIXTURE_CENTER: [number, number] = [14.525, 46.075];
export const OFFLINE_FIXTURE_ZOOM = 9;

export const offlineFixtureStyleUrl = (baseUrl: string): string =>
  `${baseUrl.replace(/\/$/, '')}${OFFLINE_FIXTURE_STYLE_PATH}`;
