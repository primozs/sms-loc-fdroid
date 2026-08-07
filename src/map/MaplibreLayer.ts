import type { Map as MapLibreMap } from 'maplibre-gl';

export type { MapLibreMap };

export const removeMlSource = (map: MapLibreMap, sourceId: string) => {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
};

export const removeMlLayer = (map: MapLibreMap, layerId: string) => {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
};

export const addMlSource = (
  map: MapLibreMap,
  id: Parameters<typeof map.addSource>['0'],
  source: Parameters<typeof map.addSource>['1'],
) => {
  if (!map.getSource(id)) {
    map.addSource(id, source);
  }
};

export const addMlLayer = (
  map: MapLibreMap,
  layer: Parameters<typeof map.addLayer>[0],
  placeBeforeId?: Parameters<typeof map.addLayer>[1],
) => {
  if (map.getLayer(layer.id)) return;
  if (placeBeforeId && map.getLayer(placeBeforeId)) {
    map.addLayer(layer, placeBeforeId);
  } else {
    map.addLayer(layer);
  }
};

/** Run after current style is ready (or on next style.load). */
export const mapSetStyleEffect = (
  map: MapLibreMap | undefined,
  effect: () => void,
) => {
  if (!map) return;
  if (map.isStyleLoaded()) {
    effect();
  } else {
    map.once('style.load', effect);
  }
};

export const mapEffect = (map: MapLibreMap | undefined, effect: () => void) => {
  mapSetStyleEffect(map, effect);
};
