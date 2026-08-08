import { describe, expect, it } from 'vitest';
import {
  OFFLINE_FIXTURE_STYLE_PATH,
  offlineFixtureStyleUrl,
} from './offlineStyle';

describe('offlineFixtureStyleUrl', () => {
  it('joins baseUrl and fixture path without a double slash', () => {
    expect(offlineFixtureStyleUrl('http://127.0.0.1:4000')).toBe(
      `http://127.0.0.1:4000${OFFLINE_FIXTURE_STYLE_PATH}`,
    );
    expect(offlineFixtureStyleUrl('http://127.0.0.1:4000/')).toBe(
      `http://127.0.0.1:4000${OFFLINE_FIXTURE_STYLE_PATH}`,
    );
  });
});
