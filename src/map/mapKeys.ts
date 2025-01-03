import type { Map } from 'ol';
import type { InjectionKey, Ref } from 'vue';
import type { MapLibreMap } from './MaplibreLayer';

export type MapKeyType = InjectionKey<Map>;
export type MaplibreKeyType = InjectionKey<Ref<MapLibreMap | undefined>>;
export type MapLibreAwaitedRef = Ref<MapLibreMap>;

export const mainMapkey = Symbol() as MapKeyType;
export const maplibreMapkey = Symbol() as MaplibreKeyType;
