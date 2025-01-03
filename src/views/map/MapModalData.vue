<script lang="ts" setup>
import { inject, onMounted, ref } from 'vue';
import {
  maplibreMapkey,
  mainMapkey,
  type MapLibreAwaitedRef,
} from '@/map/mapKeys';
import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { MapBrowserEvent } from 'ol';
import MapModal from './MapModal.vue';

const olMap = inject(mainMapkey);
const mlMap = inject(maplibreMapkey) as MapLibreAwaitedRef;
const selectedFeaturesRef = ref<MapGeoJSONFeature[]>([]);

onMounted(async () => {
  const clickHandler = (e: MapBrowserEvent<any>) => {
    const [x, y] = e.pixel;
    const bbox: [[number, number], [number, number]] = [
      [x - 15, y - 15],
      [x + 15, y + 15],
    ];

    let features = mlMap.value.queryRenderedFeatures(bbox, {
      layers: [
        'label_webcams',
        'weather-stations-temp',
        'weather-stations-wind-color',
        'pgspots-tk',
        'pgspots-lz',
      ],
    });

    // feature state only supports paint properties
    // we need to update features themselves anyway

    // features = features.map((item) => {
    //   if (item.source !== 'weather-stations') return item;
    //   const featureState = mlMap.value.getFeatureState({
    //     source: 'weather-stations',
    //     id: item.id,
    //   });

    //   // mutate props with state values
    //   // merge latest state for modal station ui
    //   item.properties = {
    //     ...item.properties,
    //     ...featureState,
    //   };
    //   return item;
    // });

    selectedFeaturesRef.value = features;
  };

  olMap!.on('click', clickHandler);
});

const handleClose = () => {
  selectedFeaturesRef.value = [];
};
</script>

<template>
  <MapModal :features="selectedFeaturesRef" @close="handleClose"></MapModal>
</template>
