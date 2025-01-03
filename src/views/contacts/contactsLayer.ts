import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import CircleStyle from 'ol/style/Circle';
import { Feature, type Map } from 'ol';
import { Point, type Geometry, LineString } from 'ol/geom';
import type { ContactDisplay } from '@/services/useContactsData';
import { fromLonLat } from 'ol/proj';
import type { Coordinate } from 'ol/coordinate';
import Icon from 'ol/style/Icon';
import Text from 'ol/style/Text';
import { getColor } from '@/map/colors';
import { logDebug } from '@/services/useLogger';
import { getLength } from 'ol/sphere';
import { formatName } from '@/app/format';
import type { Position } from '@/plugins/geolocation';

const contactsToFeatures = (contacts: ContactDisplay[]) => {
  const features: Feature[] = [];

  for (let index = 0, len = contacts.length; index < len; index++) {
    const contact = contacts[index];
    const color = getColor(index);
    const receivedResponses = contact.responses.filter(
      (item) => item.type === 'received',
    );

    if (receivedResponses.length === 0) {
      continue;
    }
    if (receivedResponses.length === 1) {
      const { lat, lon, ...rest } = receivedResponses[0];
      const point = new Point(fromLonLat([lon, lat]));
      const feature = new Feature({
        geometry: point,
        ...rest,
      });
      feature.setStyle(
        new Style({
          image: new Icon({
            color,
            crossOrigin: 'anonymous',
            src: '/icons/location-16-filled.svg',
            scale: 2,
            anchor: [0.5, 1],
          }),
          text: new Text({
            scale: 1.5,
            offsetY: 10,
            text: formatName(contact.name),
            fill: new Fill({
              color: 'black',
            }),
            stroke: new Stroke({
              color: 'white',
              width: 2,
            }),
          }),
        }),
      );
      features.push(feature);
      continue;
    }

    if (receivedResponses.length > 1) {
      // last response
      const { lat, lon, ...rest } = receivedResponses[0];
      const point = new Point(fromLonLat([lon, lat]));
      const lastPointFeature = new Feature({
        geometry: point,
        ...rest,
      });

      lastPointFeature.setStyle(
        new Style({
          image: new Icon({
            color,
            crossOrigin: 'anonymous',
            src: '/icons/location-16-filled.svg',
            scale: 2,
            anchor: [0.5, 1],
          }),
          text: new Text({
            scale: 1.5,
            offsetY: 10,
            text: formatName(contact.name),
            fill: new Fill({
              color: 'black',
            }),
            stroke: new Stroke({
              color: 'white',
              width: 2,
            }),
          }),
        }),
      );
      features.push(lastPointFeature);

      const now = new Date().getTime();
      const dayOld = now - 24 * 60 * 60 * 1000;

      // generate line
      const coordinates: Coordinate[] = [];
      for (
        let index = 0, len = receivedResponses.length;
        index < len;
        index++
      ) {
        const { lat, lon, ts } = receivedResponses[index];

        if (ts < dayOld) break;

        const coordinate = fromLonLat([lon, lat]);

        const next = receivedResponses[index + 1];
        if (next) {
          // only add coordinate if dist to next is less then 20km
          const leg = new LineString([
            fromLonLat([lon, lat]),
            fromLonLat([next.lon, next.lat]),
          ]);

          const len = getLength(leg, {});

          if (len < 20000) {
            coordinates.push(coordinate);
          } else {
            // clear all after toolong leg
            break;
          }
        } else {
          coordinates.push(coordinate);
        }
      }

      if (coordinates.length > 1) {
        const line = new LineString(coordinates);
        const feature = new Feature({
          geometry: line,
          ...rest,
        });
        feature.setStyle(
          new Style({
            stroke: new Stroke({
              color: color,
              width: 3,
            }),
            fill: new Fill({
              color: 'black',
            }),
          }),
        );
        features.push(feature);
      }
    }
  }

  return features;
};

export class ContactsLayer {
  private vectorSource: VectorSource<Feature<Geometry>>;
  private vectorLayer: VectorLayer<VectorSource<Feature<Geometry>>>;
  private map: Map;
  private features: Feature[] | undefined;

  constructor(map: Map) {
    this.map = map;
    this.vectorSource = new VectorSource<any>({
      features: [],
    });

    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          stroke: new Stroke({
            color: 'rgba(255, 255, 255, 1)',
            width: 3,
          }),
          fill: new Fill({
            color: 'rgba(0, 0, 0, 1)',
          }),
        }),
        stroke: new Stroke({
          color: 'black',
          width: 1,
        }),
      }),
    });

    map.addLayer(this.vectorLayer);
    this.vectorLayer.setZIndex(100);
  }

  update(contacts: ContactDisplay[]) {
    this.features = contactsToFeatures(contacts);
    this.vectorSource.clear();
    this.vectorSource.addFeatures(this.features);
    return this.features;
  }

  public fitToSource() {
    if (!this.features || this.features.length === 0) {
      logDebug('contactsLayers', 'no features');
      return false;
    }
    // const extent = this.vectorSource.getExtent();

    // const resolution = this.map.getView().getResolutionForExtent(extent);
    // let zoom = this.map.getView().getZoomForResolution(resolution);
    // if (zoom === undefined || zoom > 15) zoom = 13;

    // const center = getCenter(extent);

    const feature = this.features[0];
    const geometry = feature.getGeometry();
    if (geometry?.getType() === 'Point') {
      const point = geometry as Point;
      const coordinate = point.getCoordinates();
      const zoom = 13;

      this.map.getView().setCenter(coordinate);
      this.map.getView().setZoom(zoom);

      return true;
    }

    return false;
  }

  public fitToLoc(pos: Position) {
    const position = [pos.coords.longitude, pos.coords.latitude];
    const center = fromLonLat(position);
    const zoom = 13;

    this.map.getView().setCenter(center);
    this.map.getView().setZoom(zoom);
  }
}
