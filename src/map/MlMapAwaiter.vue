<script lang="ts" setup>
// stops children setup until provided maplibre is available
import { computed, inject } from 'vue';
import { maplibreMapkey } from '@/map/mapKeys';

const mlMap = inject(maplibreMapkey);

const map = computed(() => {
  return mlMap?.value;
});
</script>

<template>
  <slot v-if="!!map"></slot>
</template>
