import { describe, expect, it } from 'vitest';
import { shouldUseLocalStyle } from './localStyleDecision';

describe('shouldUseLocalStyle', () => {
  it('is false when pack is not installed', () => {
    expect(
      shouldUseLocalStyle({
        installed: false,
        started: true,
        ownershipToken: 'tok',
      }),
    ).toBe(false);
  });

  it('is false when pack is installed but native start did not prove bind', () => {
    expect(
      shouldUseLocalStyle({
        installed: true,
        started: false,
        ownershipToken: '',
      }),
    ).toBe(false);
  });

  it('is false when started without ownership token', () => {
    expect(
      shouldUseLocalStyle({
        installed: true,
        started: true,
        ownershipToken: '',
      }),
    ).toBe(false);
  });

  it('is true only when pack installed, started, and ownership token present', () => {
    expect(
      shouldUseLocalStyle({
        installed: true,
        started: true,
        ownershipToken: 'native-token',
      }),
    ).toBe(true);
  });
});
