/** Resolve when an element has non-zero client width and height. */
export const whenElementSized = (el: HTMLElement): Promise<void> => {
  if (el.clientWidth > 0 && el.clientHeight > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const ro = new ResizeObserver(() => {
      if (el.clientWidth <= 0 || el.clientHeight <= 0) return;
      ro.disconnect();
      resolve();
    });
    ro.observe(el);
  });
};
