import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import { Feature, type Map } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import { colors } from '@/map/colors';
import Icon from 'ol/style/Icon';

export class MyLocationLayer {
  private vectorSource: VectorSource;
  private vectorLayer: VectorLayer<VectorSource>;
  private feature: Feature | undefined = undefined;

  constructor(map: Map) {
    // @ts-ignore
    this.vectorSource = new VectorSource({
      features: [],
    });

    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
    });

    map.addLayer(this.vectorLayer);
    this.vectorLayer.setZIndex(1000);
  }

  update(coordinate: Coordinate) {
    const point = new Point(fromLonLat(coordinate));

    if (!this.feature) {
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
      this.feature = feature;
      this.vectorSource.addFeature(this.feature);
    } else {
      this.feature.setGeometry(point);
    }
  }

  clear() {
    this.vectorSource.clear();
  }
}
