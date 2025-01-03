// Usage:

// import { GeoLocation } from '@/plugins/geolocation';
// const loc = await GeoLocation.getLocation();

import { registerPlugin } from '@capacitor/core';
import type { GeolocationPlugin } from './definitions';

const GeoLocation = registerPlugin<GeolocationPlugin>('GeoLocation', {
  web: () => import('./web').then((m) => new m.GeolocationWeb()),
});

export * from './definitions';
export { GeoLocation };
