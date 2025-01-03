<script lang="ts" setup>
import { inject, ref, watchEffect } from 'vue';
import { mainMapkey } from '@/map/mapKeys';
import { MyLocationLayer } from './myLocationLayer';
import { useLocation } from '@/services/useLocation';
import OlOverlay from '@/map/OlOverlay.vue';
import { fromLonLat } from 'ol/proj';

const locStore = useLocation();

const map = inject(mainMapkey);
const myLocLayer = ref<MyLocationLayer>(new MyLocationLayer(map!));
const coordinates = ref<number[] | undefined>();

watchEffect(() => {
  if (!locStore.lastLocation) {
    myLocLayer.value.clear();
  } else {
    const { coords } = locStore.lastLocation;
    coordinates.value = [coords.longitude, coords.latitude];
    myLocLayer.value.update(coordinates.value);
  }
});
</script>

<template>
  <OlOverlay
    v-if="coordinates"
    :position="fromLonLat(coordinates)"
    :key="`${coordinates[0]},${coordinates[1]}`"
  >
    <div class="font-semibold text-xs p-3">
      <p>{{ $t('message.myCurrentLocation') }}</p>
    </div>
  </OlOverlay>
</template>
