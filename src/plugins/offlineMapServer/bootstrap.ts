import { Capacitor } from '@capacitor/core';
import { watchNetwork } from '@/app/watchNetwork';
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
 * Idempotent network watcher (safe on resume). Initial style sync comes from watchNetwork.
 */
export const bootstrapOfflineMaps = async () => {
  if (!Capacitor.isNativePlatform()) return;

  await ensureOfflineMapServer();

  if (!stopNetworkWatch) {
    stopNetworkWatch = watchNetwork((status) => {
      void syncStyleForConnection(status.connected);
    });
  }
};
