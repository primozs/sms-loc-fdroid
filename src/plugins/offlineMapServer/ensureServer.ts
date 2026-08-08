import { Capacitor } from '@capacitor/core';
import { config } from '@/config';
import { logDebug, logError } from '@/services/useLogger';
import { OfflineMapServer } from './plugin';

export type EnsureOfflineMapServerResult = {
  started: boolean;
  baseUrl: string;
  rootDir: string;
  installed: boolean;
  reason?: string;
};

/**
 * If a real map pack is on disk, start the Swift static server (idempotent).
 * Does not write the Dev fixture. Style override is Task 2 (`applyLocalMapsStyleIfReady`).
 */
export const ensureOfflineMapServer =
  async (): Promise<EnsureOfflineMapServerResult> => {
    if (!Capacitor.isNativePlatform()) {
      return {
        started: false,
        baseUrl: '',
        rootDir: '',
        installed: false,
        reason: 'web',
      };
    }

    try {
      const avail = await OfflineMapServer.isAvailable();
      if (!avail.available) {
        return {
          started: false,
          baseUrl: '',
          rootDir: '',
          installed: false,
          reason: avail.error ?? 'lib missing',
        };
      }

      const pack = await OfflineMapServer.getPackStatus();
      if (!pack.installed) {
        return {
          started: false,
          baseUrl: '',
          rootDir: pack.rootDir,
          installed: false,
          reason: 'pack not installed',
        };
      }

      const port = Number(config.SERVER_PORT) || 4000;
      const ret = await OfflineMapServer.start({
        rootDir: pack.rootDir,
        host: '127.0.0.1',
        port,
        fixture: false,
      });
      logDebug('OfflineMapServer started', ret.baseUrl);
      return {
        started: true,
        baseUrl: ret.baseUrl,
        rootDir: ret.rootDir,
        installed: true,
      };
    } catch (e) {
      logError(e);
      return {
        started: false,
        baseUrl: '',
        rootDir: '',
        installed: false,
        reason: String(e),
      };
    }
  };
