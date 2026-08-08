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

export const applyStyleOverride = (useLocal: boolean) => {
  const layers = useUseBaseLayers();
  const next = nextStyleOverride(layers.styleUrlOverride, useLocal);
  if (next !== layers.styleUrlOverride) {
    layers.setStyleUrlOverride(next);
  }
};

/** Pack ready + prefer local (e.g. airplane mode). */
export const applyLocalMapsStyleIfReady = (packReady: boolean) => {
  applyStyleOverride(packReady);
};
