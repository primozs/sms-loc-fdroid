import { Preferences } from '@capacitor/preferences';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const SELECTED_BASE_LAYER = 'selected_base_layer';

const currentTheme = () =>
  document.documentElement.classList.contains('ion-palette-dark')
    ? 'dark'
    : 'light';

export type LayerType = 'STENAR_LIGHT' | 'STENAR_BLUE' | 'STENAR_TOPO';

export type LayerTypeItem = {
  title: string;
  key: LayerType;
  url: string;
  attributions: string[];
};

export const MAP_BASE_LAYERS: Record<LayerType, LayerTypeItem> = {
  STENAR_LIGHT: {
    title: 'Stenar light',
    key: 'STENAR_LIGHT',
    url: 'https://maptiles.stenar.si/styles/stenar-light/style.json',
    attributions: [
      '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      '<a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a>',
      '<a href="https://stenar.si" target="_blank">© Stenar</a>',
    ],
  },
  STENAR_BLUE: {
    title: 'Stenar blue',
    key: 'STENAR_BLUE',
    url: 'https://maptiles.stenar.si/styles/stenar-blue/style.json',
    attributions: [
      '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      '<a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a>',
      '<a href="https://stenar.si" target="_blank">© Stenar</a>',
    ],
  },
  STENAR_TOPO: {
    title: 'Stenar topo',
    key: 'STENAR_TOPO',
    url: 'https://maptiles.stenar.si/styles/stenar-topo/style.json',
    attributions: [
      '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      '<a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a>',
      '<a href="https://github.com/nst-guide/osm-liberty-topo" target="_blank">© osm-liberty-topo</a>',
      '<a href="https://stenar.si" target="_blank">© Stenar</a>',
    ],
  },
};

export const MAP_BASE_LAYERS_LIST: LayerTypeItem[] = [
  MAP_BASE_LAYERS.STENAR_LIGHT,
  MAP_BASE_LAYERS.STENAR_BLUE,
  MAP_BASE_LAYERS.STENAR_TOPO,
];

const defaultLayerForTheme = (theme?: string): LayerTypeItem =>
  theme === 'light' ? MAP_BASE_LAYERS.STENAR_LIGHT : MAP_BASE_LAYERS.STENAR_BLUE;

export const useUseBaseLayers = defineStore('useUseBaseLayers', () => {
  // Sync default so map can init immediately (Preferences may overwrite).
  // Don't inject('theme') here — Pinia setup has no component inject context.
  const selectedLayer = ref<LayerTypeItem>(
    defaultLayerForTheme(currentTheme()),
  );
  /** When set (offline pack / Dev fixture), MapLibre uses this URL instead of selectedLayer. */
  const styleUrlOverride = ref<string | null>(null);

  Preferences.get({
    key: SELECTED_BASE_LAYER,
  }).then(({ value }) => {
    if (!value) return;
    selectedLayer.value = JSON.parse(value);
  });

  const setSelectedBaseLayer = async (item: LayerTypeItem) => {
    selectedLayer.value = item;

    await Preferences.set({
      key: SELECTED_BASE_LAYER,
      value: JSON.stringify(item),
    });
  };

  const setStyleUrlOverride = (url: string | null) => {
    styleUrlOverride.value = url;
  };

  return {
    selectedLayer,
    setSelectedBaseLayer,
    styleUrlOverride,
    setStyleUrlOverride,
  };
});
