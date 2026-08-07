import { describe, expect, test } from 'vitest';
import { distanceMeters, formatLength } from '@/app/format';

describe('distanceMeters / formatLength', () => {
  test('same point is ~0 m', () => {
    expect(distanceMeters([14.5, 46.05], [14.5, 46.05])).toBeLessThan(0.01);
  });

  test('~1 degree latitude is roughly 111 km', () => {
    const m = distanceMeters([0, 0], [0, 1]);
    expect(m).toBeGreaterThan(110_000);
    expect(m).toBeLessThan(112_000);
    expect(formatLength([0, 0], [0, 1])).toMatch(/km$/);
  });

  test('short distance formats as meters', () => {
    // ~11 m north
    expect(formatLength([0, 0], [0, 0.0001])).toMatch(/m$/);
  });
});
