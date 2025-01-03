// @ts-ignore
import packageJson from '../package.json';
// @ts-ignore
const ENV_VARIABLES = import.meta.env;
const MAPS_STYLE = 'https://example.com/styles/some-style/style.json';
const LOCAL_MAPS_STYLE =
  'http://localhost:4000/map/styles/planet-small/style.json';
const SERVER_PORT = '4000';
const OFFLINE_MAP_DOWNLOAD_URL = 'http://192.168.91.116:4500/map.tar.gz';

export const config = {
  DEV: ENV_VARIABLES.DEV,
  PROD: ENV_VARIABLES.PROD,
  MODE: ENV_VARIABLES.MODE,
  MAPS_STYLE,
  APPLICATION_VERSION: packageJson.version,
  DB_NAME: 'smsloc',
  LOCAL_MAPS_STYLE,
  SERVER_PORT,
  OFFLINE_MAP_DOWNLOAD_URL,
};
