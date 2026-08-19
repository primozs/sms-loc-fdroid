import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { watchNetwork } from '@/app/watchNetwork';
import { logError } from '@/services/useLogger';
import { setOfflineStyleOverride } from './applyLocalStyle';
import { ensureOfflineMapServer } from './ensureServer';

let stopNetworkWatch: (() => void) | undefined;

const syncStyleForConnection = async (connected: boolean) => {
  if (connected) {
    // Online → stenar base layers (clear pack override only).
    setOfflineStyleOverride(false);
    return;
  }
  const result = await ensureOfflineMapServer();
  setOfflineStyleOverride(result.started && result.installed);
};

/**
 * Start Swift server when pack installed; MapLibre uses LOCAL_MAPS_STYLE only when offline.
 * Idempotent network watcher (safe on resume).
 */
export const bootstrapOfflineMaps = async () => {
  if (!Capacitor.isNativePlatform()) return;

  await ensureOfflineMapServer();

  try {
    const status = await Network.getStatus();
    await syncStyleForConnection(status.connected);
  } catch (e) {
    logError(e);
  }

  if (!stopNetworkWatch) {
    stopNetworkWatch = watchNetwork((status) => {
      void syncStyleForConnection(status.connected);
    });
  }
};
