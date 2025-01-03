import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import { defaults as defaultInteractions } from 'ol/interaction';
import { DragRotate } from 'ol/interaction';

export const initMap = (el?: HTMLDivElement | string) => {
  const center: [number, number] = [11, 23];

  const olMap = new Map({
    layers: [],
    interactions: defaultInteractions({
      altShiftDragRotate: false,
      doubleClickZoom: false,
      shiftDragZoom: false,
    }).extend([
      new DragRotate({
        condition: (event) => {
          const browserEvent = event.originalEvent;
          return browserEvent.shiftKey;
        },
      }),
    ]),
    controls: defaultControls({
      rotate: false,
      attribution: true,
    }),
    view: new View({
      center: fromLonLat(center),
      zoom: 0,
      enableRotation: true,
      constrainRotation: false,
      maxZoom: 20,
    }),
  });

  el && olMap.setTarget(el);

  return olMap;
};
