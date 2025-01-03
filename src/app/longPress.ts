import { Haptics } from '@capacitor/haptics';
import type { Directive } from 'vue';

export const vLongPress: Directive = {
  mounted: (el: HTMLElement, binding) => {
    if (typeof binding.value !== 'function') {
      throw new Error('vLongPress expression should be function');
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;

    let start = (e: TouchEvent | MouseEvent) => {
      // @ts-ignore
      if (e.type === 'click' && e.button !== 0) {
        return;
      }

      if (timeout === null) {
        timeout = setTimeout(() => {
          handler(e);
        }, 1000);
      }
    };

    let cancel = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
    };

    const handler = async (e: TouchEvent | MouseEvent) => {
      await Haptics.vibrate();
      binding.value(e);
    };

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start);

    el.addEventListener('click', cancel);
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchcancel', cancel);
  },
};
