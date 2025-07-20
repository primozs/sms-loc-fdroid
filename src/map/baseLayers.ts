import { Preferences } from '@capacitor/preferences';
import { defineStore } from 'pinia';
import { type Ref, inject, ref } from 'vue';

const SELECTED_BASE_LAYER = 'selected_base_layer';

export const useUseBaseLayers = defineStore('useUseBaseLayers', () => {
  const selectedLayer = ref<LayerTypeItem>();
  const theme = inject<{ theme: Ref<string>; toggleTheme: () => void }>(
    'theme',
  );

  Preferences.get({
    key: SELECTED_BASE_LAYER,
  }).then(({ value }) => {
    if (!value) {
      if (theme?.theme.value === 'light') {
        selectedLayer.value = MAP_BASE_LAYERS.STENAR_LIGHT;
      } else {
        selectedLayer.value = MAP_BASE_LAYERS.STENAR_BLUE;
      }
      return;
    }
    selectedLayer.value = JSON.parse(value);
  });

  const setSelectedBaseLayer = async (item: LayerTypeItem) => {
    selectedLayer.value = item;

    await Preferences.set({
      key: SELECTED_BASE_LAYER,
      value: JSON.stringify(item),
    });
  };

  return { selectedLayer, setSelectedBaseLayer };
});

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
    url: 'https://tiles.stenar.si/styles/stenar-light/style.json',
    attributions: [
      '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      '<a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a>',
      '<a href="https://stenar.si" target="_blank">© Stenar</a>',
    ],
  },
  STENAR_BLUE: {
    title: 'Stenar blue',
    key: 'STENAR_BLUE',
    url: 'https://tiles.stenar.si/styles/stenar-blue/style.json',
    attributions: [
      '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
      '<a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a>',
      '<a href="https://stenar.si" target="_blank">© Stenar</a>',
    ],
  },
  STENAR_TOPO: {
    title: 'Stenar topo',
    key: 'STENAR_TOPO',
    url: 'https://tiles.stenar.si/styles/stenar-topo/style.json',
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
