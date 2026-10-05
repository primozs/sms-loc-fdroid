import { describe, expect, it } from 'vitest';
import { shouldApplyStyleWatch } from './styleSwapGate';

describe('shouldApplyStyleWatch', () => {
  it('applies override change before map load (offline stenar never loads)', () => {
    expect(
      shouldApplyStyleWatch({
        mapExists: true,
        hasSelected: true,
        selectedKey: 'STENAR_BLUE',
        override: 'http://127.0.0.1:4000/map/styles/planet-small/style.json',
        prevSelectedKey: 'STENAR_BLUE',
        prevOverride: null,
      }),
    ).toBe(true);
  });

  it('skips when map is not created yet', () => {
    expect(
      shouldApplyStyleWatch({
        mapExists: false,
        hasSelected: true,
        selectedKey: 'STENAR_BLUE',
        override: 'http://127.0.0.1:4000/map/styles/planet-small/style.json',
      }),
    ).toBe(false);
  });

  it('skips when selected layer and override are unchanged', () => {
    expect(
      shouldApplyStyleWatch({
        mapExists: true,
        hasSelected: true,
        selectedKey: 'STENAR_BLUE',
        override: null,
        prevSelectedKey: 'STENAR_BLUE',
        prevOverride: null,
      }),
    ).toBe(false);
  });
});
