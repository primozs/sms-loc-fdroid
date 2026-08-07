<script lang="ts" setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { maplibreMapkey, type MapLibreAwaitedRef } from '@/map/mapKeys';
import MapModal, { type MapModalFeature } from './MapModal.vue';
import type { MapLayerMouseEvent } from 'maplibre-gl';

const mlMap = inject(maplibreMapkey) as MapLibreAwaitedRef;
const selectedFeaturesRef = ref<MapModalFeature[]>([]);

const clickHandler = (e: MapLayerMouseEvent) => {
  const map = mlMap.value;
  const point = e.point;
  const bbox: [[number, number], [number, number]] = [
    [point.x - 15, point.y - 15],
    [point.x + 15, point.y + 15],
  ];

  const features = map.queryRenderedFeatures(bbox, {
    layers: [
      'label_webcams',
      'weather-stations-temp',
      'weather-stations-wind-color',
      'pgspots-tk',
      'pgspots-lz',
    ].filter((id) => !!map.getLayer(id)),
  });

  selectedFeaturesRef.value = features as unknown as MapModalFeature[];
};

onMounted(() => {
  mlMap.value.on('click', clickHandler);
});

onUnmounted(() => {
  mlMap.value?.off('click', clickHandler);
});

const handleClose = () => {
  selectedFeaturesRef.value = [];
};
</script>

<template>
  <MapModal :features="selectedFeaturesRef" @close="handleClose"></MapModal>
</template>
