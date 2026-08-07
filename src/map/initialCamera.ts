import type { ContactDisplay } from '@/services/useContactsData';
import type { Position } from '@/plugins/geolocation';

export type MapCamera = {
  center: [number, number];
  zoom: number;
};

const DEFAULT_PIN_ZOOM = 13;

/** Newest received Loc: across contacts by `ts`. */
export const newestReceived = (
  contacts: ContactDisplay[] | undefined,
): { ts: number; lon: number; lat: number } | undefined => {
  let newest: { ts: number; lon: number; lat: number } | undefined;

  for (const contact of contacts ?? []) {
    for (const response of contact.responses) {
      if (response.type !== 'received') continue;
      if (!newest || response.ts > newest.ts) {
        newest = { ts: response.ts, lon: response.lon, lat: response.lat };
      }
    }
  }

  return newest;
};

export const newestReceivedTs = (
  contacts: ContactDisplay[] | undefined,
): number | undefined => newestReceived(contacts)?.ts;

/** Newest received Loc: across contacts (by ts), else device lastLocation. */
export const cameraFromContactsOrLocation = (
  contacts: ContactDisplay[] | undefined,
  lastLocation: Position | undefined,
  zoom = DEFAULT_PIN_ZOOM,
): MapCamera | undefined => {
  const newest = newestReceived(contacts);
  if (newest) {
    return { center: [newest.lon, newest.lat], zoom };
  }

  if (lastLocation) {
    return {
      center: [lastLocation.coords.longitude, lastLocation.coords.latitude],
      zoom,
    };
  }

  return undefined;
};
