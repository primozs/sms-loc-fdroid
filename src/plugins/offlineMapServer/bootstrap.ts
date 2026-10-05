import { Capacitor } from '@capacitor/core';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { watchNetwork } from '@/app/watchNetwork';
import { logError } from '@/services/useLogger';
import { setOfflineStyleOverride } from './applyLocalStyle';
import { ensureOfflineMapServer } from './ensureServer';
import { shouldUseLocalStyle } from './localStyleDecision';

let stopNetworkWatch: (() => void) | undefined;

/** Capacitor `connected` = has a network *interface*, not "has internet". */
export const isNetworkOnline = (status: ConnectionStatus): boolean =>
  status.connected && status.connectionType !== 'none';

const syncStyleForConnection = async (status: ConnectionStatus) => {
  if (isNetworkOnline(status)) {
    // Online → stenar base layers (clear pack override only).
    setOfflineStyleOverride(false);
    return;
  }
  const result = await ensureOfflineMapServer();
  // Fail-closed: need pack + proven start + process-private ownership token.
  setOfflineStyleOverride(shouldUseLocalStyle(result));
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
    await syncStyleForConnection(status);
  } catch (e) {
    logError(e);
  }

  if (!stopNetworkWatch) {
    stopNetworkWatch = watchNetwork((status) => {
      void syncStyleForConnection(status);
    });
  }
};
