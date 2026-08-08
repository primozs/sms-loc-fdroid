export type OfflineMapServerStartOptions = {
  /** Absolute path, or '' → Java `filesDir/offline-map`. */
  rootDir?: string;
  host?: string;
  port?: number;
  /** Dev PoC only — write styles/fixture under root (never for product pack). */
  fixture?: boolean;
};

export type OfflineMapPackStatus = {
  rootDir: string;
  installed: boolean;
  stylePath: string;
  busy?: boolean;
};

export type OfflineMapProgress = {
  percent: number;
  transferred: number;
  total: number;
};

export interface OfflineMapServerPlugin {
  start(
    options?: OfflineMapServerStartOptions,
  ): Promise<{ baseUrl: string; rootDir: string }>;
  stop(): Promise<void>;
  getBaseUrl(): Promise<{ baseUrl: string }>;
  isAvailable(): Promise<{ available: boolean; error?: string }>;
  getPackStatus(): Promise<OfflineMapPackStatus>;
  installPack(options: {
    url: string;
  }): Promise<{ installed: boolean; rootDir: string }>;
  cancelInstall(): Promise<void>;
  removePack(): Promise<{ removed: boolean }>;
  addListener(
    eventName: 'offlineMapProgress',
    listenerFunc: (progress: OfflineMapProgress) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}
