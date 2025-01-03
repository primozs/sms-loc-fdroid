import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import { Feature, type Map } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import { colors } from '../../map/colors';
import Icon from 'ol/style/Icon';
import { ResponseStore, type ResponseData } from '@/services/responses';

export class HistoryResponseLayer {
  private vectorSource: VectorSource;
  private vectorLayer: VectorLayer<VectorSource>;
  private mResponse: ResponseData | null = null;
  private mMap: Map;

  constructor(map: Map) {
    this.mMap = map;
    this.vectorSource = new VectorSource<any>({
      features: [],
    });

    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
    });

    map.addLayer(this.vectorLayer);
    this.vectorLayer.setZIndex(100);
  }

  async drawResponseId(responseId: number | undefined) {
    if (responseId === undefined) {
      this.vectorSource.clear();
      return;
    }

    if (!this.mResponse || this.mResponse.id !== responseId) {
      const response =
        await ResponseStore.getInstance().getResponseById(responseId);

      this.mResponse = response;
    }

    if (this.mResponse) {
      this.vectorSource.clear();
      const feature = this.createFeature([
        this.mResponse.lon,
        this.mResponse.lat,
      ]);
      this.vectorSource.addFeature(feature);

      const size = this.mMap.getSize();
      this.mMap.getView().fit(this.vectorSource.getExtent(), {
        size,
        padding: [100, 100, 100, 100],
        maxZoom: 12,
      });
    }
  }

  private createFeature(coordinate: Coordinate) {
    const point = new Point(fromLonLat(coordinate));
    const feature = new Feature({
      geometry: point,
    });
    feature.setStyle(
      new Style({
        image: new Icon({
          color: colors['red']['600'],
          crossOrigin: 'anonymous',
          src: '/icons/location-16-filled.svg',
          scale: 2,
          anchor: [0.5, 1],
        }),
      }),
    );
    return feature;
  }
}
