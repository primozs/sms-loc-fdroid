import { registerPlugin } from '@capacitor/core';
import type {
  OfflineMapServerPlugin,
} from './types';

export const OfflineMapServer = registerPlugin<OfflineMapServerPlugin>(
  'OfflineMapServer',
);
