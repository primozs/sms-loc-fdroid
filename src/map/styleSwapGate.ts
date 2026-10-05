/**
 * Whether MlMap may call setStyle for a base-layer / override change.
 * Only requires a Map instance — never wait for 'load'. Offline remote styles
 * never fire load, which previously blocked LOCAL_MAPS_STYLE forever.
 */
export const shouldApplyStyleWatch = (opts: {
  mapExists: boolean;
  hasSelected: boolean;
  selectedKey: string;
  override: string | null;
  prevSelectedKey?: string;
  prevOverride?: string | null;
}): boolean => {
  if (!opts.hasSelected || !opts.mapExists) return false;
  if (
    opts.prevSelectedKey !== undefined &&
    opts.prevSelectedKey === opts.selectedKey &&
    opts.prevOverride === opts.override
  ) {
    return false;
  }
  return true;
};
