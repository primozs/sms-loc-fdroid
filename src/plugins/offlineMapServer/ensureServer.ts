import { Capacitor } from '@capacitor/core';
import { config } from '@/config';
import { logDebug, logError } from '@/services/useLogger';
import { OfflineMapServer } from './plugin';

export type EnsureOfflineMapServerResult = {
  started: boolean;
  baseUrl: string;
  rootDir: string;
  installed: boolean;
  /** Process-private; from native start after bind prove. Required for local style. */
  ownershipToken: string;
  reason?: string;
};

/**
 * If a real map pack is on disk, start the Swift static server (idempotent).
 * Does not write the Dev fixture. Style override is handled by bootstrap / network watch.
 */
export const ensureOfflineMapServer =
  async (): Promise<EnsureOfflineMapServerResult> => {
    if (!Capacitor.isNativePlatform()) {
      return {
        started: false,
        baseUrl: '',
        rootDir: '',
        installed: false,
        ownershipToken: '',
        reason: 'web',
      };
    }

    try {
      // Pack probe is pure Java — do not gate it on Swift lib load.
      const pack = await OfflineMapServer.getPackStatus();
      if (!pack.installed) {
        return {
          started: false,
          baseUrl: '',
          rootDir: pack.rootDir,
          installed: false,
          ownershipToken: '',
          reason: 'pack not installed',
        };
      }

      const avail = await OfflineMapServer.isAvailable();
      if (!avail.available) {
        // Pack present; no token without a successful start.
        return {
          started: false,
          baseUrl: '',
          rootDir: pack.rootDir,
          installed: true,
          ownershipToken: '',
          reason: avail.error ?? 'lib missing',
        };
      }

      const port = Number(config.SERVER_PORT) || 4000;
      try {
        const ret = await OfflineMapServer.start({
          rootDir: pack.rootDir,
          host: '127.0.0.1',
          port,
          fixture: false,
        });
        if (!ret.ownershipToken) {
          return {
            started: false,
            baseUrl: '',
            rootDir: pack.rootDir,
            installed: true,
            ownershipToken: '',
            reason: 'no ownership token',
          };
        }
        logDebug('OfflineMapServer started', ret.baseUrl);
        return {
          started: true,
          baseUrl: ret.baseUrl,
          rootDir: ret.rootDir,
          installed: true,
          ownershipToken: ret.ownershipToken,
        };
      } catch (e) {
        // Start failed (e.g. port taken) — no ownership token; stay fail-closed.
        logError(e);
        return {
          started: false,
          baseUrl: '',
          rootDir: pack.rootDir,
          installed: true,
          ownershipToken: '',
          reason: String(e),
        };
      }
    } catch (e) {
      logError(e);
      return {
        started: false,
        baseUrl: '',
        rootDir: '',
        installed: false,
        ownershipToken: '',
        reason: String(e),
      };
    }
  };
