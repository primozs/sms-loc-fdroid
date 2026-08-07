<script lang="ts" setup>
import { inject, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { maplibreMapkey, type MapLibreAwaitedRef } from '@/map/mapKeys';
import { MyLocationLayer } from './myLocationLayer';
import { useLocation } from '@/services/useLocation';
import { MapPopupSet } from '@/map/MapPopupSet';
import type { Position } from '@/plugins/geolocation';

const locStore = useLocation();
const { t } = useI18n();
const mlMap = inject(maplibreMapkey) as MapLibreAwaitedRef;

let myLocLayer: MyLocationLayer | undefined;
let popup: MapPopupSet | undefined;

const syncLocation = (loc: Position | null | undefined) => {
  if (!myLocLayer || !popup) return;

  if (!loc) {
    myLocLayer.clear();
    popup.clear();
    return;
  }

  const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude];
  myLocLayer.update(coords);
  popup.setItems([
    {
      lngLat: coords,
      text: t('message.myCurrentLocation'),
    },
  ]);
};

onMounted(() => {
  const map = mlMap.value;
  myLocLayer = new MyLocationLayer(map);
  popup = new MapPopupSet(map);
  syncLocation(locStore.lastLocation);
});

watch(
  () => locStore.lastLocation,
  (loc) => syncLocation(loc),
);

onUnmounted(() => {
  popup?.clear();
  popup = undefined;
  myLocLayer?.destroy();
  myLocLayer = undefined;
});
</script>

<template>
  <div v-if="false"></div>
</template>
