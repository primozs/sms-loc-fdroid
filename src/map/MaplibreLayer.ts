// https://github.com/geoblocks/ol-maplibre-layer/blob/master/src/ol-maplibre-layer.ts
// if you make new layer class it does not work as fast as this

import { Layer } from 'ol/layer';
import { toLonLat } from 'ol/proj.js';
import maplibregl from 'maplibre-gl';
import type { Options as LayerOptions } from 'ol/layer/Layer.js';
import mlcontour from 'maplibre-contour';
import type { Map as OlMap } from 'ol';
import { Protocol } from 'pmtiles';

const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

export type MapLibreMap = maplibregl.Map;

export type MapLibreLayerOptions = LayerOptions & {
  maplibreOptions: maplibregl.MapOptions;
};

const demSource = new mlcontour.DemSource({
  url: 'https://tiles.stenar.si/terrarium/512/terrarium_tiles/{z}/{x}/{y}.png',
  encoding: 'terrarium',
  maxzoom: 12,
  worker: true,
  cacheSize: 100,
  timeoutMs: 10_000,
});
// @ts-ignore
demSource.setupMaplibre(maplibregl);

export const mapLibreLayerCreator = (options: MapLibreLayerOptions) => {
  const { maplibreOptions, ...baseOptions } = options;

  const mlMap = new maplibregl.Map({
    ...maplibreOptions,
    attributionControl: false,
    boxZoom: false,
    doubleClickZoom: false,
    dragPan: false,
    dragRotate: false,
    interactive: false,
    keyboard: false,
    pitchWithRotate: false,
    scrollZoom: false,
    touchZoomRotate: false,
  });

  const mlLayer = new Layer({
    ...baseOptions,
    properties: {
      id: 'maplibre',
    },
    render: function (frameState) {
      const canvas = mlMap.getCanvas();
      const viewState = frameState?.viewState;

      const visible = mlLayer.getVisible();
      canvas.style.display = visible ? 'block' : 'none';
      canvas.style.position = 'absolute';

      const opacity = mlLayer.getOpacity();
      canvas.style.opacity = String(opacity);

      // adjust view parameters in mapbox
      const rotation = viewState?.rotation;
      mlMap.jumpTo({
        center: toLonLat(viewState?.center) as [number, number],
        zoom: viewState.zoom - 1,
        bearing: (-rotation * 180) / Math.PI,
      });

      // cancel the scheduled update & trigger synchronous redraw
      // see https://github.com/mapbox/mapbox-gl-js/issues/7893#issue-408992184
      // NOTE: THIS MIGHT BREAK IF UPDATING THE MAPBOX VERSION
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      // @ts-ignore
      if (mlMap._frame) {
        // @ts-ignore
        mlMap._frame.cancel();
        // @ts-ignore
        mlMap._frame = null;
      }
      // @ts-ignore
      mlMap._render();

      return canvas;
    },
  });

  return { mlMap, mlLayer };
};

export const CONTOURS_SOURCE_ID = 'contours';
export const CONTOURS_LAYER_ID = 'contours';
export const CONTOURS_TEXT_LAYER_ID = 'contour-text';
export const PLACE_BEFORE_LAYER_ID = 'landuse_cemetery';

export const addContoursLayer = (map: MapLibreMap | undefined) => {
  if (!map) return;

  addMlSource(map, CONTOURS_SOURCE_ID, {
    type: 'vector',
    tiles: [
      demSource.contourProtocolUrl({
        multiplier: 1,
        overzoom: 1,
        thresholds: {
          10.5: [200, 1000],
          11: [200, 1000],
          12: [100, 500],
          13: [100, 500],
          14: [50, 200],
          15: [20, 100],
        },
        elevationKey: 'ele',
        levelKey: 'level',
        contourLayer: CONTOURS_LAYER_ID,
      }),
    ],
    maxzoom: 15,
  });

  addMlLayer(
    map,
    {
      id: CONTOURS_LAYER_ID,
      type: 'line',
      source: CONTOURS_SOURCE_ID,
      'source-layer': CONTOURS_SOURCE_ID,
      paint: {
        'line-color': 'rgba(0,0,0, 20%)',
        'line-width': ['match', ['get', 'level'], 1, 0.9, 0.4],
      },
      layout: {
        'line-join': 'round',
      },
    },
    PLACE_BEFORE_LAYER_ID,
  );

  addMlLayer(
    map,
    {
      id: CONTOURS_TEXT_LAYER_ID,
      type: 'symbol',
      source: CONTOURS_SOURCE_ID,
      'source-layer': CONTOURS_SOURCE_ID,
      filter: ['>', ['get', 'level'], 0],
      paint: {
        'text-halo-color': 'white',
        'text-halo-width': 1,
      },
      layout: {
        'symbol-placement': 'line',
        'text-anchor': 'center',
        'text-size': 10,
        'text-field': ['concat', ['number-format', ['get', 'ele'], {}], ' m'],
        'text-font': ['Open Sans Regular'],
      },
    },
    PLACE_BEFORE_LAYER_ID,
  );
};

/**
 * on map.setStyle there is no need to remove layers
 */
export const removeContoursLayer = (map: MapLibreMap | undefined) => {
  if (!map) return;

  removeMlLayer(map, CONTOURS_LAYER_ID);
  removeMlLayer(map, CONTOURS_TEXT_LAYER_ID);
  removeMlSource(map, CONTOURS_SOURCE_ID);
};

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
  if (!map.getLayer(layer.id)) {
    map.addLayer(layer, placeBeforeId);
  }
};

export const moveMlLayerAfter = (
  map: MapLibreMap,
  layer: string,
  placeAfterId?: string,
) => {
  const style = map.getStyle();
  if (!style) return;
  const found = style.layers.findIndex((item) => item.id === placeAfterId);
  if (found === -1) return;
  const nextIndex = found + 1;
  const nextLayer = style.layers[nextIndex];
  if (!nextLayer) return;
  map.moveLayer(layer, nextLayer.id);
};

export const addMlLayerAtribution = (olMap: OlMap, attributionMsg: string) => {
  setTimeout(() => {
    const mlLayer = olMap
      .getAllLayers()
      .find((item) => item.getProperties().id === 'maplibre');

    const mlSource = mlLayer?.getSource();
    if (!mlSource) return;
    const attribution = mlSource.getAttributions();
    if (!attribution) return;

    // @ts-ignore
    const prevAttributions = (attribution() as string[]) ?? [];

    const newAttributions = [
      attributionMsg,
      ...prevAttributions.map((item) => item),
    ];

    mlSource.setAttributions(newAttributions);
  }, 0);
};

export const removeMlLayerAtribution = (
  olMap: OlMap,
  attributionMsg: string,
) => {
  setTimeout(() => {
    const mlLayer = olMap
      .getAllLayers()
      .find((item) => item.getProperties().id === 'maplibre');

    const mlSource = mlLayer?.getSource();
    if (!mlSource) return;
    const attribution = mlSource.getAttributions();
    if (!attribution) return;

    // @ts-ignore
    const prevAttributions = (attribution() as string[]) ?? [];
    const newAttributions = prevAttributions.filter(
      (item) => item !== attributionMsg,
    );

    mlSource.setAttributions(newAttributions);
  }, 0);
};

export const setMlLayoutProperty = (
  map: MapLibreMap,
  layerId: string,
  name: string,
  value: any,
  options?: Parameters<typeof map.setLayoutProperty>[3],
) => {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, name, value, options);
  }
};

export const setMlPaintProperty = (
  map: MapLibreMap,
  layerId: string,
  name: string,
  value: any,
  options?: Parameters<typeof map.setPaintProperty>[3],
) => {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, name, value, options);
  }
};

export const setMlFilter = (
  map: MapLibreMap,
  layerId: string,
  filter?: Parameters<typeof map.setFilter>[1],
  options?: Parameters<typeof map.setFilter>[2],
) => {
  if (map.getLayer(layerId)) {
    map.setFilter(layerId, filter, options);
  }
};

/**
 * Usage example
 *  mapSetStyleEffect(
 *     mlMap.value,
 *     () => {
 *       removeContoursLayer(mlMap.value);
 *       addContoursLayer(mlMap.value);
 *     },
 *     'landcover_grass'
 *   );
 *
 * Wait for map to remove or add sources and layers
 * Tried events
 * draw.update, data, load, style.load, idle
 */
export const mapSetStyleEffect = (
  map: MapLibreMap | undefined,
  effect: () => void,
  waitForLayer?: string,
) => {
  if (!map) return;

  // map.loaded() is not working, thats why map._loaded
  // when you just called setStyle(), style is not really loaded
  // thats why map.isStyleLoaded()
  if (map && map._loaded && map.isStyleLoaded()) {
    // new style is still not loaded thats why "idle"
    map.once('idle', () => {
      // because new style is still not completely loaded if
      // we need specific layer to be present, we need to wait for it
      if (waitForLayer) {
        const waiting = () => {
          if (!map.getLayer(waitForLayer)) {
            setTimeout(waiting, 200);
          } else {
            effect();
          }
        };
        waiting();
      } else {
        effect();
      }
    });
  } else {
    // if map is not loaded wait for style.load or 'load'
    // if we go with "style.load" we need to still wait for map.isStyleLoaded()
    // which is slower then using "load"

    // going with
    // "style.load" there is a case it never happens
    // "load" there is a case it never happens
    // "idle" there is a case it never happens but best bet

    // map.once('style.load', () => {
    //   const waiting = () => {
    //     if (!map.isStyleLoaded()) {
    //       setTimeout(waiting, 200);
    //     } else {
    //       effect();
    //     }
    //   };
    //   waiting();
    // });

    map.once('idle', () => {
      effect();
    });
  }
};

export const mapEffect = (map: MapLibreMap | undefined, effect: () => void) => {
  if (!map) return;
  if (map && map._loaded && map.isStyleLoaded()) {
    effect();
  } else {
    map.once('style.load', () => {
      effect();
    });
  }
};

export const mapWaitForStyleLoaded = (
  map: MapLibreMap | undefined,
  effect: () => void,
) => {
  if (!map) return;

  const waiting = () => {
    if (!map.isStyleLoaded()) {
      setTimeout(waiting, 200);
    } else {
      effect();
    }
  };
  waiting();
};

export const mapWaitForLayer = (
  map: MapLibreMap | undefined,
  layerId: string,
  effect: () => void,
) => {
  if (!map) return;

  const waiting = () => {
    if (!map.getLayer(layerId)) {
      setTimeout(waiting, 200);
    } else {
      effect();
    }
  };
  waiting();
};

// EVENTS
// dataloading manytimes
// styledata manytimes
// data manytimes
// sourcedata many times

// reload options

// style.load
// load

// update options
// styledata manytimes good option for change base layer
// idle manytimes always at the end fires again on update

// SomeLayerClass
// track init false
// INIT SOURCES AND LAYERS: MAP ALREADY SETUP
// constructor
//      mapSetStyleEffect (init when map is already setup)
// INIT SOURCES AND LAYERS: AFTER MAP SETUP (reload)
//      events
//        style.load and wait for style loaded
//            (init on page reload after map setup) prevent first time initialization
//
// RE INIT AFTER STYLE CHANGE
//      event styledata

export interface BaseMlLayerOptions {
  map: MapLibreMap;
  visibility: 'visible' | 'none';
  attachBeforeLayerId?: string;
}

export abstract class BaseMlLayer {
  protected map: MapLibreMap;
  protected visible: 'visible' | 'none';
  protected styleLoaded: boolean = false;
  protected attachBeforeLayerId: string | undefined;
  private initialized = false;

  constructor(options: BaseMlLayerOptions) {
    this.map = options.map;
    this.visible = options.visibility;
    this.attachBeforeLayerId = options.attachBeforeLayerId;

    // INIT SOURCES AND LAYERS: MAP ALREADY SETUP
    mapSetStyleEffect(this.map, () => {
      this.addLayersAndSources();
      this.setVisible(this.visible);
      this.initialized = true;
      this.styleLoaded = true;
    });

    // INIT SOURCES AND LAYERS: AFTER MAP SETUP (reload)

    this.map.on('style.load', this.styleLoadHandler);

    // RE INIT AFTER STYLE CHANGE
    this.map.on('styledata', this.styleDataHandler);
  }

  styleLoadHandler = () => {
    mapWaitForStyleLoaded(this.map, () => {
      this.styleLoaded = true;
      this.addLayersAndSources();
      this.setVisible(this.visible);
      this.onStyleLoaded();
    });
  };

  onStyleLoaded = () => {
    //
  };

  styleDataHandler = () => {
    if (!this.initialized) return;
    if (!this.attachBeforeLayerId) {
      this.addLayersAndSources();
      this.setVisible(this.visible);
      this.onStyleDataChanged();
    }
  };

  onStyleDataChanged = () => {
    //
  };

  abstract addLayersAndSources(): void;

  public setVisible(val: 'visible' | 'none') {
    this.visible = val;
  }

  public destory() {
    this.map.off('style.load', this.styleLoadHandler);
    this.map.off('styledata', this.styleDataHandler);
  }
}
