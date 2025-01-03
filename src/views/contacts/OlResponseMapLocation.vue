<script lang="ts" setup>
import { inject, ref, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { mainMapkey } from '@/map/mapKeys';
import { HistoryResponseLayer } from './historyResponseLayer';

const route = useRoute();

const map = inject(mainMapkey);
const historyLocLayer = ref<HistoryResponseLayer>();
historyLocLayer.value = new HistoryResponseLayer(map!);

watchEffect(() => {
  const id = Number(route.params.id);
  historyLocLayer.value?.drawResponseId(id);
});
</script>

<template>
  <div v-if="false"></div>
</template>
@/views/contacts/historyResponseLayer
