import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock('@/config', () => ({
  config: { SERVER_PORT: '4000' },
}));

vi.mock('@/services/useLogger', () => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
}));

const getPackStatus = vi.fn();
const isAvailable = vi.fn();
const start = vi.fn();

vi.mock('./plugin', () => ({
  OfflineMapServer: {
    getPackStatus: (...args: unknown[]) => getPackStatus(...args),
    isAvailable: (...args: unknown[]) => isAvailable(...args),
    start: (...args: unknown[]) => start(...args),
  },
}));

import { ensureOfflineMapServer } from './ensureServer';

describe('ensureOfflineMapServer', () => {
  const rootDir = '/data/user/0/si.stenar.smsloc/files/offline-map';

  beforeEach(() => {
    getPackStatus.mockReset();
    isAvailable.mockReset();
    start.mockReset();
  });

  it('reports installed when pack present and Swift lib unavailable', async () => {
    getPackStatus.mockResolvedValue({
      installed: true,
      rootDir,
      stylePath: 'map/styles/planet-small/style.json',
      busy: false,
    });
    isAvailable.mockResolvedValue({ available: false, error: 'lib missing' });

    const result = await ensureOfflineMapServer();

    expect(result).toMatchObject({
      installed: true,
      started: false,
      rootDir,
      ownershipToken: '',
      reason: 'lib missing',
    });
    expect(start).not.toHaveBeenCalled();
  });

  it('reports installed when pack present and start throws', async () => {
    getPackStatus.mockResolvedValue({
      installed: true,
      rootDir,
      stylePath: 'map/styles/planet-small/style.json',
      busy: false,
    });
    isAvailable.mockResolvedValue({ available: true });
    start.mockRejectedValue(new Error('port in use'));

    const result = await ensureOfflineMapServer();

    expect(result).toMatchObject({
      installed: true,
      started: false,
      rootDir,
      ownershipToken: '',
    });
    expect(result.reason).toContain('port in use');
  });

  it('returns ownershipToken when start succeeds', async () => {
    getPackStatus.mockResolvedValue({
      installed: true,
      rootDir,
      stylePath: 'map/styles/planet-small/style.json',
      busy: false,
    });
    isAvailable.mockResolvedValue({ available: true });
    start.mockResolvedValue({
      baseUrl: 'http://127.0.0.1:4000',
      rootDir,
      ownershipToken: 'native-token-xyz',
    });

    const result = await ensureOfflineMapServer();

    expect(result).toMatchObject({
      installed: true,
      started: true,
      ownershipToken: 'native-token-xyz',
      baseUrl: 'http://127.0.0.1:4000',
    });
  });

  it('does not report started when start returns an empty token', async () => {
    getPackStatus.mockResolvedValue({
      installed: true,
      rootDir,
      stylePath: 'map/styles/planet-small/style.json',
      busy: false,
    });
    isAvailable.mockResolvedValue({ available: true });
    start.mockResolvedValue({
      baseUrl: 'http://127.0.0.1:4000',
      rootDir,
      ownershipToken: '',
    });

    const result = await ensureOfflineMapServer();

    expect(result).toMatchObject({
      installed: true,
      started: false,
      ownershipToken: '',
      reason: 'no ownership token',
    });
  });

  it('reports not installed when pack is missing', async () => {
    getPackStatus.mockResolvedValue({
      installed: false,
      rootDir,
      stylePath: 'map/styles/planet-small/style.json',
      busy: false,
    });

    const result = await ensureOfflineMapServer();

    expect(result).toMatchObject({
      installed: false,
      started: false,
      ownershipToken: '',
      reason: 'pack not installed',
    });
    expect(isAvailable).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });
});
