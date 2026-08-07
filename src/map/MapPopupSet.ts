import { Popup, type Map as MapLibreMap } from 'maplibre-gl';

export type PopupItem = {
  lngLat: [number, number];
  text: string;
};

/** Imperative MapLibre Popups — no Vue-owned marker DOM. */
export class MapPopupSet {
  private popups: Popup[] = [];

  constructor(private map: MapLibreMap) {}

  setItems(items: PopupItem[]) {
    this.clear();
    for (const item of items) {
      const text = item.text?.trim();
      if (!text) continue;

      const popup = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'smsloc-map-popup',
      })
        .setLngLat(item.lngLat)
        .setText(text)
        .addTo(this.map);
      this.popups.push(popup);
    }
  }

  clear() {
    for (const popup of this.popups) {
      popup.remove();
    }
    this.popups = [];
  }
}
