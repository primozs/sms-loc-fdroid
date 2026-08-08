// @ts-ignore
import packageJson from '../package.json';
// @ts-ignore
const ENV_VARIABLES = import.meta.env;
const MAPS_STYLE =
  'https://maptiles.stenar.si/styles/stenar-light/style.json';
const LOCAL_MAPS_STYLE =
  'http://127.0.0.1:4000/map/styles/planet-small/style.json';
const SERVER_PORT = '4000';
const OFFLINE_MAP_DOWNLOAD_URL =
  'https://github.com/primozs/small-planet/raw/master/public/map.tar.gz';

export const config = {
  DEV: ENV_VARIABLES.DEV,
  PROD: ENV_VARIABLES.PROD,
  MODE: ENV_VARIABLES.MODE,
  MAPS_STYLE,
  LOCAL_MAPS_STYLE,
  SERVER_PORT,
  OFFLINE_MAP_DOWNLOAD_URL,
  APPLICATION_VERSION: packageJson.version,
  DB_NAME: 'smsloc',
};
