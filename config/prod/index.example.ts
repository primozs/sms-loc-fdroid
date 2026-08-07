// @ts-ignore
import packageJson from '../package.json';
// @ts-ignore
const ENV_VARIABLES = import.meta.env;
const MAPS_STYLE = 'https://example.com/styles/some-style/style.json';

export const config = {
  DEV: ENV_VARIABLES.DEV,
  PROD: ENV_VARIABLES.PROD,
  MODE: ENV_VARIABLES.MODE,
  MAPS_STYLE,
  APPLICATION_VERSION: packageJson.version,
  DB_NAME: 'smsloc',
};
