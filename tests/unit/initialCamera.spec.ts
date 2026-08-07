import { describe, expect, it } from 'vitest';
import {
  cameraFromContactsOrLocation,
  newestReceivedTs,
} from '@/map/initialCamera';
import type { ContactDisplay } from '@/services/useContactsData';

const contacts = [
  {
    responses: [{ type: 'received', lon: 1, lat: 2, ts: 100 }],
  },
  {
    responses: [
      { type: 'sent', lon: 0, lat: 0, ts: 300 },
      { type: 'received', lon: 14.5, lat: 46.1, ts: 200 },
    ],
  },
] as ContactDisplay[];

describe('newestReceivedTs', () => {
  it('returns max received ts, ignoring sent', () => {
    expect(newestReceivedTs(contacts)).toBe(200);
  });

  it('returns undefined when none', () => {
    expect(newestReceivedTs([])).toBeUndefined();
  });
});

describe('cameraFromContactsOrLocation', () => {
  it('prefers newest received Loc: by ts, not list order', () => {
    expect(cameraFromContactsOrLocation(contacts, undefined)).toEqual({
      center: [14.5, 46.1],
      zoom: 13,
    });
  });

  it('falls back to lastLocation', () => {
    const loc = {
      coords: { longitude: 15, latitude: 46 },
    } as any;
    expect(cameraFromContactsOrLocation([], loc)).toEqual({
      center: [15, 46],
      zoom: 13,
    });
  });
});
