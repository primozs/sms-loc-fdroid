// @ts-ignore
import packageJson from '../package.json';
// @ts-ignore
const ENV_VARIABLES = import.meta.env;
const MAPS_STYLE =
  'https://maptiles.stenar.si/styles/stenar-light/style.json';

export const config = {
  DEV: ENV_VARIABLES.DEV,
  PROD: ENV_VARIABLES.PROD,
  MODE: ENV_VARIABLES.MODE,
  MAPS_STYLE,
  APPLICATION_VERSION: packageJson.version,
  DB_NAME: 'smsloc',
};
