<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { mainMapkey } from '@/map/mapKeys';
import Overlay, { type Positioning } from 'ol/Overlay';

const props = withDefaults(
  defineProps<{
    position: number[] | [number, number];
    visible?: boolean;
    positioning?: Positioning;
    autoPan?: boolean;
    offset?: number[] | [number, number];
  }>(),
  {
    visible: true,
    // @ts-ignore
    offset: [-4, -38], // eslint-disable-line
    positioning: 'bottom-center',
    autoPan: false,
  },
);

const map = inject(mainMapkey);
const overlayEl = ref<HTMLDialogElement>();
const arrowEl = ref<HTMLElement>();
const overlay = ref<Overlay>();

onMounted(async () => {
  overlay.value = new Overlay({
    element: overlayEl.value,
    autoPan: props.autoPan,
    positioning: props.positioning,
    offset: props.offset,
  });
  overlay.value.setPosition(props.position);
  map?.addOverlay(overlay.value);
});

onUnmounted(() => {
  if (!overlay.value) return;
  map?.removeOverlay(overlay.value);
  overlay.value.dispose();
});
</script>

<template>
  <div
    ref="overlayEl"
    :class="[
      `
      relative
      bg-white dark:bg-neutral-800 text-gray-800 dark:text-gray-50
        w-max
        transform duration-200 delay-100 opacity-0
        rounded-md
        shadow-lg
        border
        border-gray-200 dark:border-gray-700
        `,
      { 'opacity-100': props.visible },
    ]"
    role="tooltip"
  >
    <slot></slot>
    <div
      ref="arrowEl"
      :class="[
        `
        bg-white dark:bg-neutral-800
         w-2 h-2 transform rotate-45
      `,
        {
          'absolute -bottom-1 left-1/2': props.positioning === 'bottom-center',
        },
      ]"
    ></div>
  </div>
</template>
