import { Map as MapLibreMap, type MapOptions } from 'maplibre-gl';
import { setupMaplibre } from './setupMaplibre';

export type InitMapOptions = {
  container: HTMLElement | string;
  style: string;
};

/** Minimal MapLibre Map options — sizing via default trackResize. */
export const initMap = (options: InitMapOptions) => {
  setupMaplibre();

  const mapOptions: MapOptions = {
    container: options.container,
    style: options.style,
    center: [11, 23],
    zoom: 0,
    maxZoom: 20,
    doubleClickZoom: false,
    pitchWithRotate: false,
    attributionControl: false,
    dragRotate: true,
  };

  return new MapLibreMap(mapOptions);
};
