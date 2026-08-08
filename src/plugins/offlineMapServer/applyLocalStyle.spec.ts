import { describe, expect, it } from 'vitest';
import { nextStyleOverride } from './applyLocalStyle';

describe('nextStyleOverride', () => {
  const local = 'http://127.0.0.1:4000/map/styles/planet-small/style.json';
  const fixture = 'http://127.0.0.1:4000/styles/fixture/style.json';

  it('sets LOCAL_MAPS_STYLE when useLocal', () => {
    expect(nextStyleOverride(null, true, local)).toBe(local);
    expect(nextStyleOverride(fixture, true, local)).toBe(local);
  });

  it('clears only LOCAL_MAPS_STYLE when not useLocal', () => {
    expect(nextStyleOverride(local, false, local)).toBe(null);
    expect(nextStyleOverride(fixture, false, local)).toBe(fixture);
    expect(nextStyleOverride(null, false, local)).toBe(null);
  });
});
