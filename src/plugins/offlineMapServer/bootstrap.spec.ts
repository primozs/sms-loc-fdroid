import { describe, expect, it } from 'vitest';
import { isNetworkOnline } from './bootstrap';

describe('isNetworkOnline', () => {
  it('is false when disconnected or connectionType none', () => {
    expect(
      isNetworkOnline({ connected: false, connectionType: 'none' }),
    ).toBe(false);
    expect(
      isNetworkOnline({ connected: true, connectionType: 'none' }),
    ).toBe(false);
  });

  it('is true for wifi/cellular when connected', () => {
    expect(
      isNetworkOnline({ connected: true, connectionType: 'wifi' }),
    ).toBe(true);
    expect(
      isNetworkOnline({ connected: true, connectionType: 'cellular' }),
    ).toBe(true);
  });
});
