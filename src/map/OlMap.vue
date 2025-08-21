<script lang="ts" setup>
import { onUnmounted, provide, ref, watchEffect } from 'vue';
import { initMap } from '@/map/initMap';
import 'ol/ol.css';
import { mainMapkey, maplibreMapkey } from '@/map/mapKeys';
import { config } from '@/config';
import {
  mapLibreLayerCreator,
  mapSetStyleEffect,
  type MapLibreMap,
  addContoursLayer,
  PLACE_BEFORE_LAYER_ID,
} from './MaplibreLayer';
import { LayerTypeItem, useUseBaseLayers } from './baseLayers';
import { Source } from 'ol/source';
import type { Layer } from 'ol/layer';
import type LayerRenderer from 'ol/renderer/Layer';
import { watchNetwork } from '@/app/watchNetwork';

const mapInitialized = ref(false);
const mapEl = ref<HTMLDivElement>();
const map = initMap();
provide(mainMapkey, map);

const mlMap = ref<MapLibreMap>();
provide(maplibreMapkey, mlMap);

const layersSetting = useUseBaseLayers();

let mlBaseSource: Source;
let mlBaseLayer: Layer<Source, LayerRenderer<any>>;

const initializeBaseLayers = (el: HTMLElement, baseLayer: LayerTypeItem) => {
  const source = new Source({
    attributions: baseLayer.attributions,
  });

  const mlMapAndLayer = mapLibreLayerCreator({
    maplibreOptions: {
      container: el,
      style: baseLayer.url,
    },
    source,
  });

  mlBaseSource = source;
  mlBaseLayer = mlMapAndLayer.mlLayer;
  mlMap.value = mlMapAndLayer.mlMap;

  mlBaseLayer && map.addLayer(mlBaseLayer);
  mlBaseLayer?.setZIndex(0);
};

const setBaseLayer = (baseLayer: LayerTypeItem) => {
  if (baseLayer.key === 'STENAR_TOPO') {
    const style = mlMap.value?.getStyle();
    if (style?.name === 'Stenar topo') {
      return;
    }

    mlMap.value?.setStyle(baseLayer.url);

    mapSetStyleEffect(
      mlMap.value,
      () => {
        addContoursLayer(mlMap.value);
      },
      PLACE_BEFORE_LAYER_ID,
    );
  } else {
    mlMap.value?.setStyle(baseLayer.url);
  }

  mlBaseSource?.setAttributions(baseLayer.attributions);
};

// initialize map
watchEffect(() => {
  if (
    mapInitialized.value === false &&
    mapEl.value &&
    layersSetting.selectedLayer
  ) {
    mapInitialized.value = true;
    setTimeout(() => {
      initializeBaseLayers(mapEl.value!, layersSetting.selectedLayer!);

      map.setTarget(mapEl.value);
      setBaseLayer(layersSetting.selectedLayer!);
    }, 0);
  }
});

// watch base layer change
let prevSelectedKey = '';
watchEffect(() => {
  const selected = layersSetting.selectedLayer;
  if (!selected) return;

  // skip if update is for the same layer
  if (prevSelectedKey === selected.key) return;
  prevSelectedKey = selected.key;

  setBaseLayer(selected);
});

watchNetwork((status) => {
  const selectedBaseLayer = layersSetting.selectedLayer;

  if (status.connected === true && selectedBaseLayer) {
    setBaseLayer(selectedBaseLayer);
  }

  if (status.connected === false) {
    mlMap.value?.setStyle(config.LOCAL_MAPS_STYLE);
  }
});

onUnmounted(() => {
  mlBaseLayer?.dispose();
  map.dispose();
  mlMap.value?.remove();
});
</script>

<template>
  <div
    class="h-[calc(100%+0px)] relative main-map"
    ref="mapEl"
    id="main-map"
  ></div>
  <slot></slot>
</template>
