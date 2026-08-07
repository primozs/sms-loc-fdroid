import { whenElementSized } from '@/map/whenElementSized';
import { describe, expect, it, vi } from 'vitest';

describe('whenElementSized', () => {
  it('resolves immediately when already sized', async () => {
    const el = {
      clientWidth: 320,
      clientHeight: 480,
    } as HTMLElement;
    await expect(whenElementSized(el)).resolves.toBeUndefined();
  });

  it('waits for ResizeObserver when starting at 0×0', async () => {
    let callback: ResizeObserverCallback | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          callback = cb;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );

    const el = { clientWidth: 0, clientHeight: 0 } as HTMLElement;
    const pending = whenElementSized(el);
    el.clientWidth = 100;
    el.clientHeight = 200;
    callback?.([] as ResizeObserverEntry[], {} as ResizeObserver);
    await expect(pending).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
