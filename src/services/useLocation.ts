import { GeoLocation, Position } from '@/plugins/geolocation';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { logDebug, logError } from './useLogger';

export const useLocation = defineStore('use-location', () => {
  const lastLocation = ref<Position | undefined>();

  const getLocation = async () => {
    try {
      const status = await GeoLocation.checkPermissions();
      if (status.location !== 'granted') {
        logDebug('getLocation', 'location not granted');
        return;
      }

      const loc = await GeoLocation.getCurrentPosition({
        enableHighAccuracy: true,
        maximumAge: 1000,
      });
      lastLocation.value = loc;
      return loc;
    } catch (error) {
      logError(error);
    }
  };

  return { lastLocation, getLocation };
});

// is gps enabled
export const useLocationService = defineStore('useLocationService', () => {
  const locServiceEnabled = ref(true);
  return { locServiceEnabled };
});
