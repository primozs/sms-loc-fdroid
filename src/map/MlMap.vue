<script lang="ts" setup>
import { onUnmounted, provide, ref, watch } from 'vue';
import { onIonViewDidEnter } from '@ionic/vue';
import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibreMapkey } from '@/map/mapKeys';
import { mapSetStyleEffect, type MapLibreMap } from './MaplibreLayer';
import { type LayerTypeItem, useUseBaseLayers } from './baseLayers';
import { initMap } from './initMap';
import { AttributionControl } from 'maplibre-gl';
import { logError } from '@/services/useLogger';

const mapEl = ref<HTMLDivElement>();
const mlMap = ref<MapLibreMap>();
const ready = ref(false);
provide(maplibreMapkey, mlMap);

const layersSetting = useUseBaseLayers();
let attributionControl: AttributionControl | undefined;
let currentStyleUrl = '';
let mapLoaded = false;

const setAttributions = (map: MapLibreMap, attributions: string[]) => {
  if (attributionControl) {
    map.removeControl(attributionControl);
  }
  attributionControl = new AttributionControl({
    compact: true,
    customAttribution: attributions,
  });
  map.addControl(attributionControl);
};

const applyStyle = (map: MapLibreMap, url: string) => {
  if (currentStyleUrl === url) return false;
  currentStyleUrl = url;
  map.setStyle(url);
  return true;
};

const setBaseLayer = (baseLayer: LayerTypeItem) => {
  const map = mlMap.value;
  if (!map) return;
  if (!applyStyle(map, baseLayer.url)) return;
  mapSetStyleEffect(map, () => {
    setAttributions(map, baseLayer.attributions);
  });
};

const createMap = (el: HTMLDivElement) => {
  const baseLayer = layersSetting.selectedLayer;
  if (!baseLayer || mlMap.value) return;

  currentStyleUrl = baseLayer.url;
  const map = initMap({
    container: el,
    style: baseLayer.url,
  });
  mlMap.value = map;

  map.on('error', (e) => {
    logError(e?.error ?? e);
  });

  setAttributions(map, baseLayer.attributions);

  map.once('load', () => {
    mapLoaded = true;
    ready.value = true;
    map.resize();
  });
};

watch(
  mapEl,
  (el) => {
    if (el) createMap(el);
  },
  { flush: 'post' },
);

watch(
  () => layersSetting.selectedLayer,
  (selected, prev) => {
    if (!selected || !mlMap.value || !mapLoaded) return;
    if (!prev || prev.key === selected.key) return;
    setBaseLayer(selected);
  },
);

onIonViewDidEnter(() => {
  mlMap.value?.resize();
});

onUnmounted(() => {
  ready.value = false;
  mapLoaded = false;
  mlMap.value?.remove();
  mlMap.value = undefined;
  attributionControl = undefined;
});
</script>

<template>
  <div class="map-host">
    <div ref="mapEl" id="main-map" class="map-canvas"></div>
    <div v-if="ready" class="map-overlays">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.map-host {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.map-canvas {
  width: 100%;
  height: 100%;
}
.map-canvas :deep(.maplibregl-map),
.map-canvas :deep(.maplibregl-canvas-container),
.map-canvas :deep(.maplibregl-canvas) {
  width: 100%;
  height: 100%;
}
.map-overlays {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.map-overlays :deep(.app-overlay) {
  pointer-events: auto;
}
</style>
