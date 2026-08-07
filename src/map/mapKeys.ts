import type { InjectionKey, Ref } from 'vue';
import type { MapLibreMap } from './MaplibreLayer';

export type MaplibreKeyType = InjectionKey<Ref<MapLibreMap | undefined>>;
export type MapLibreAwaitedRef = Ref<MapLibreMap>;

export const maplibreMapkey = Symbol() as MaplibreKeyType;
