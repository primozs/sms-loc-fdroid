import type { ContactDisplay } from '@/services/useContactsData';
import { getColor } from '@/map/colors';
import { logDebug } from '@/services/useLogger';
import { distanceMeters, formatName } from '@/app/format';
import type { Position } from '@/plugins/geolocation';
import type { MapLibreMap } from '@/map/MaplibreLayer';
import { addMlLayer, addMlSource } from '@/map/MaplibreLayer';
import type { GeoJSONSource } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';

const SOURCE_ID = 'contacts';
const LINE_LAYER_ID = 'contacts-lines';
const PIN_LAYER_ID = 'contacts-pins';
const LABEL_LAYER_ID = 'contacts-labels';

export type ContactOverlay = {
  coordinates: [number, number];
  message: string;
  key: string;
};

type PinProps = {
  kind: 'pin';
  color: string;
  name: string;
  message?: string;
};

const emptyFc = (): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [],
});

const contactsToGeoJSON = (contacts: ContactDisplay[]) => {
  const features: Feature<Point | LineString, Record<string, unknown>>[] = [];
  const overlays: ContactOverlay[] = [];

  for (let index = 0, len = contacts.length; index < len; index++) {
    const contact = contacts[index];
    const color = getColor(index);
    const receivedResponses = contact.responses.filter(
      (item) => item.type === 'received',
    );

    if (receivedResponses.length === 0) continue;

    const latest = receivedResponses[0];
    const pin: Feature<Point, PinProps> = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [latest.lon, latest.lat],
      },
      properties: {
        kind: 'pin',
        color,
        name: formatName(contact.name),
        ...(latest.message ? { message: latest.message } : {}),
      },
    };
    features.push(pin);

    const message = latest.message?.trim();
    if (message) {
      overlays.push({
        coordinates: [latest.lon, latest.lat],
        message,
        key: `${latest.lon},${latest.lat}`,
      });
    }

    if (receivedResponses.length > 1) {
      const now = Date.now();
      const dayOld = now - 24 * 60 * 60 * 1000;
      const coordinates: [number, number][] = [];

      for (let i = 0, n = receivedResponses.length; i < n; i++) {
        const { lat, lon, ts } = receivedResponses[i];
        if (ts < dayOld) break;

        const next = receivedResponses[i + 1];
        if (next) {
          const lenM = distanceMeters([lon, lat], [next.lon, next.lat]);
          if (lenM < 20000) {
            coordinates.push([lon, lat]);
          } else {
            break;
          }
        } else {
          coordinates.push([lon, lat]);
        }
      }

      if (coordinates.length > 1) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: { kind: 'line', color },
        });
      }
    }
  }

  return {
    collection: { type: 'FeatureCollection', features } as FeatureCollection,
    overlays,
  };
};

/** Parent mounts this only after map `load`. */
export class ContactsLayer {
  private map: MapLibreMap;
  private features: FeatureCollection = emptyFc();
  private firstPin: [number, number] | undefined;

  constructor(map: MapLibreMap) {
    this.map = map;
    this.map.on('style.load', this.onStyleLoad);
    this.ensureLayers();
  }

  private onStyleLoad = () => {
    this.ensureLayers();
    this.setData(this.features);
  };

  private ensureLayers() {
    addMlSource(this.map, SOURCE_ID, {
      type: 'geojson',
      data: emptyFc(),
    });

    addMlLayer(this.map, {
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'line'],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 3,
      },
    });

    addMlLayer(this.map, {
      id: PIN_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'pin'],
      paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    addMlLayer(this.map, {
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'pin'],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 14,
        'text-offset': [0, 1.4],
        'text-anchor': 'top',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5,
      },
    });
  }

  private setData(data: FeatureCollection) {
    const source = this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data);
  }

  update(contacts: ContactDisplay[]) {
    const { collection, overlays } = contactsToGeoJSON(contacts ?? []);
    this.features = collection;
    this.firstPin = undefined;

    for (const f of collection.features) {
      if (f.geometry?.type === 'Point') {
        this.firstPin = f.geometry.coordinates as [number, number];
        break;
      }
    }

    this.ensureLayers();
    this.setData(collection);
    return { overlays, hasFeatures: !!this.firstPin };
  }

  public fitToSource() {
    if (!this.firstPin) {
      logDebug('contactsLayers', 'no features');
      return false;
    }
    this.map.easeTo({ center: this.firstPin, zoom: 13 });
    return true;
  }

  public fitToLoc(pos: Position) {
    this.map.easeTo({
      center: [pos.coords.longitude, pos.coords.latitude],
      zoom: 13,
    });
  }

  public destroy() {
    this.map.off('style.load', this.onStyleLoad);
  }
}
