import type { MapLibreMap } from '@/map/MaplibreLayer';
import { addMlLayer, addMlSource } from '@/map/MaplibreLayer';
import { colors } from '@/map/colors';
import { ResponseStore, type ResponseData } from '@/services/responses';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';

const SOURCE_ID = 'history-response';
const LAYER_ID = 'history-response-pin';

const emptyFc = (): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
});

/** Parent mounts this only after map `load`. */
export class HistoryResponseLayer {
  private map: MapLibreMap;
  private mResponse: ResponseData | null = null;

  constructor(map: MapLibreMap) {
    this.map = map;
    this.map.on('style.load', this.onStyleLoad);
    this.ensureLayers();
  }

  private onStyleLoad = () => {
    this.ensureLayers();
    if (this.mResponse) {
      this.drawPoint(this.mResponse.lon, this.mResponse.lat);
    }
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

  private drawPoint(lon: number, lat: number) {
    const source = this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: {},
        },
      ],
    });

    this.map.fitBounds(
      [
        [lon, lat],
        [lon, lat],
      ],
      { padding: 100, maxZoom: 12 },
    );
  }

  async drawResponseId(responseId: number | undefined) {
    if (responseId === undefined) {
      const source = this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(emptyFc());
      return;
    }

    if (!this.mResponse || this.mResponse.id !== responseId) {
      const response =
        await ResponseStore.getInstance().getResponseById(responseId);
      this.mResponse = response;
    }

    if (this.mResponse) {
      this.ensureLayers();
      this.drawPoint(this.mResponse.lon, this.mResponse.lat);
    }
  }

  public destroy() {
    this.map.off('style.load', this.onStyleLoad);
  }
}
