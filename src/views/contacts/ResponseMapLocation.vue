<script lang="ts" setup>
import { inject, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { maplibreMapkey, type MapLibreAwaitedRef } from '@/map/mapKeys';
import { HistoryResponseLayer } from './historyResponseLayer';

const props = defineProps<{
  /** True when MapLibre was constructed centered on this response. */
  skipInitialFit?: boolean;
}>();

const route = useRoute();
const mlMap = inject(maplibreMapkey) as MapLibreAwaitedRef;

let historyLocLayer: HistoryResponseLayer | undefined;
let didInitialDraw = false;

const draw = (id: number, fitCamera: boolean) => {
  if (!historyLocLayer) return;
  void historyLocLayer.drawResponseId(id, { fitCamera });
};

onMounted(() => {
  historyLocLayer = new HistoryResponseLayer(mlMap.value);
  draw(Number(route.params.id), !props.skipInitialFit);
  didInitialDraw = true;
});

watch(
  () => route.params.id,
  (id) => {
    if (!historyLocLayer || !didInitialDraw) return;
    draw(Number(id), true);
  },
);

onUnmounted(() => {
  historyLocLayer?.destroy();
  historyLocLayer = undefined;
});
</script>

<template>
  <div v-if="false"></div>
</template>
