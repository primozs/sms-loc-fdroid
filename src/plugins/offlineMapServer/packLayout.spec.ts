import { describe, expect, it } from 'vitest';
import {
  OFFLINE_PACK_STYLE_PATH,
  isOfflineMapPackTree,
} from './packLayout';

describe('isOfflineMapPackTree', () => {
  it('requires style + tiles + fonts', () => {
    const ok = new Set([
      OFFLINE_PACK_STYLE_PATH,
      'map/tiles',
      'map/fonts',
    ]);
    expect(isOfflineMapPackTree((p) => ok.has(p))).toBe(true);
    expect(
      isOfflineMapPackTree((p) => p !== 'map/fonts' && ok.has(p)),
    ).toBe(false);
  });
});
