import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { watchNetwork } from '@/app/watchNetwork';
import { applyLocalMapsStyleIfReady } from './applyLocalStyle';
import { ensureOfflineMapServer } from './ensureServer';

let stopNetworkWatch: (() => void) | undefined;

const syncStyleForConnection = async (connected: boolean) => {
  if (connected) {
    // Online → stenar base layers (clear pack override only).
    applyLocalMapsStyleIfReady(false);
    return;
  }
  const result = await ensureOfflineMapServer();
  applyLocalMapsStyleIfReady(result.started && result.installed);
};

/**
 * Start Swift server when pack installed; MapLibre uses LOCAL_MAPS_STYLE only when offline.
 * Idempotent network watcher (safe on resume).
 */
export const bootstrapOfflineMaps = async () => {
  if (!Capacitor.isNativePlatform()) return;

  const result = await ensureOfflineMapServer();

  try {
    const { connected } = await Network.getStatus();
    if (!connected) {
      applyLocalMapsStyleIfReady(result.started && result.installed);
    } else {
      applyLocalMapsStyleIfReady(false);
    }
  } catch {
    // If Network unavailable, prefer local when pack is up (airplane-safe).
    applyLocalMapsStyleIfReady(result.started && result.installed);
  }

  if (!stopNetworkWatch) {
    stopNetworkWatch = watchNetwork((status) => {
      void syncStyleForConnection(status.connected);
    });
  }

  return result;
};
