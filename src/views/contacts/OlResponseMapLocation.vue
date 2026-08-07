<script lang="ts" setup>
import { inject, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { maplibreMapkey, type MapLibreAwaitedRef } from '@/map/mapKeys';
import { HistoryResponseLayer } from './historyResponseLayer';

const route = useRoute();
const mlMap = inject(maplibreMapkey) as MapLibreAwaitedRef;

let historyLocLayer: HistoryResponseLayer | undefined;

onMounted(() => {
  historyLocLayer = new HistoryResponseLayer(mlMap.value);
  void historyLocLayer.drawResponseId(Number(route.params.id));
});

watch(
  () => route.params.id,
  (id) => {
    if (!historyLocLayer) return;
    void historyLocLayer.drawResponseId(Number(id));
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
