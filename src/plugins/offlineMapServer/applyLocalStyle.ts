import { config } from '@/config';
import { useUseBaseLayers } from '@/map/baseLayers';

/**
 * Next MapLibre styleUrlOverride.
 * useLocal → LOCAL_MAPS_STYLE; otherwise clear only that URL (keep Dev fixture).
 */
export const nextStyleOverride = (
  current: string | null,
  useLocal: boolean,
  localStyle: string = config.LOCAL_MAPS_STYLE,
): string | null => {
  if (useLocal) return localStyle;
  if (current === localStyle) return null;
  return current;
};

/** Apply or clear the product offline pack style override. */
export const setOfflineStyleOverride = (useLocal: boolean) => {
  const layers = useUseBaseLayers();
  const next = nextStyleOverride(layers.styleUrlOverride, useLocal);
  if (next !== layers.styleUrlOverride) {
    layers.setStyleUrlOverride(next);
  }
};
