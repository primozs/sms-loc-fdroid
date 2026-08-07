import type { MapLibreMap } from '@/map/MaplibreLayer';
import { addMlLayer, addMlSource } from '@/map/MaplibreLayer';
import { colors } from '@/map/colors';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

const SOURCE_ID = 'my-location';
const LAYER_ID = 'my-location-pin';

const emptyFc = (): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
});

/** Parent mounts this only after map `load`. */
export class MyLocationLayer {
  private map: MapLibreMap;
  private lastCoordinate: [number, number] | null = null;

  constructor(map: MapLibreMap) {
    this.map = map;
    this.map.on('style.load', this.onStyleLoad);
    this.ensureLayers();
  }

  private onStyleLoad = () => {
    this.ensureLayers();
    this.restore();
  };

  private ensureLayers() {
    addMlSource(this.map, SOURCE_ID, {
      type: 'geojson',
      data: emptyFc(),
    });

    addMlLayer(this.map, {
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': 8,
        'circle-color': colors.red['600'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  private restore() {
    if (this.lastCoordinate) {
      this.applyCoords(this.lastCoordinate);
    }
  }

  private applyCoords(coordinate: [number, number] | number[]) {
    const source = this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coordinate,
          },
          properties: {},
        },
      ],
    });
  }

  update(coordinate: [number, number] | number[]) {
    this.lastCoordinate = coordinate as [number, number];
    this.ensureLayers();
    this.applyCoords(coordinate);
  }

  clear() {
    this.lastCoordinate = null;
    const source = this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(emptyFc());
  }

  public destroy() {
    this.map.off('style.load', this.onStyleLoad);
  }
}
