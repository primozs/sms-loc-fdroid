import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let configured = false;

/** One-time MapLibre Vite worker URL setup. */
export const setupMaplibre = () => {
  if (configured) return;
  setWorkerUrl(workerUrl);
  configured = true;
};
