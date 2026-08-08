<script lang="ts" setup>
import { onUnmounted, provide, ref, watch } from 'vue';
import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibreMapkey } from '@/map/mapKeys';
import { mapSetStyleEffect, type MapLibreMap } from './MaplibreLayer';
import { type LayerTypeItem, useUseBaseLayers } from './baseLayers';
import { initMap } from './initMap';
import { AttributionControl, type LngLatLike } from 'maplibre-gl';
import { logError } from '@/services/useLogger';

const props = defineProps<{
  /** Camera used at `new Map()` when already known (avoids post-load jump). */
  initialCenter?: LngLatLike;
  initialZoom?: number;
}>();

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

const activeStyleUrl = () =>
  layersSetting.styleUrlOverride ?? layersSetting.selectedLayer.url;

const setBaseLayer = (baseLayer: LayerTypeItem, styleUrl?: string) => {
  const map = mlMap.value;
  if (!map) return;
  const url = styleUrl ?? baseLayer.url;
  if (!applyStyle(map, url)) return;
  mapSetStyleEffect(map, () => {
    setAttributions(map, baseLayer.attributions);
  });
};

const createMap = (el: HTMLDivElement) => {
  const baseLayer = layersSetting.selectedLayer;
  if (!baseLayer || mlMap.value) return;

  const styleUrl = activeStyleUrl();
  currentStyleUrl = styleUrl;
  const map = initMap({
    container: el,
    style: styleUrl,
    center: props.initialCenter,
    zoom: props.initialZoom,
  });
  mlMap.value = map;

  map.on('error', (e) => {
    logError(e?.error ?? e);
  });

  setAttributions(map, baseLayer.attributions);

  map.once('load', () => {
    mapLoaded = true;
    ready.value = true;
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
  () =>
    [
      layersSetting.selectedLayer,
      layersSetting.styleUrlOverride,
    ] as const,
  ([selected, override], prev) => {
    if (!selected || !mlMap.value || !mapLoaded) return;
    const prevSelected = prev?.[0];
    const prevOverride = prev?.[1];
    if (
      prevSelected &&
      prevSelected.key === selected.key &&
      prevOverride === override
    ) {
      return;
    }
    setBaseLayer(selected, override ?? selected.url);
  },
);

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
/* Definite box once mounted into a laid-out IonContent scroll host */
.map-host {
  position: absolute;
  inset: 0;
}
.map-canvas {
  position: absolute;
  inset: 0;
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
