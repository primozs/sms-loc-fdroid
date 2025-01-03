<script lang="ts" setup>
import { inject, ref, watchEffect } from 'vue';
import ErrorCard from '@/components/ErrorCard.vue';
import SpinnerDisplay from '@/components/SpinnerDisplay.vue';
import { useContactsData } from '@/services/useContactsData';
import { ContactsLayer } from './contactsLayer';
import type { Map } from 'ol';
import type { Point } from 'ol/geom';
import { mainMapkey } from '@/map/mapKeys';
import OlOverlay from '@/map/OlOverlay.vue';
import { useLocation } from '@/services/useLocation';

type OverlayData = { coordinates: number[]; message: string; key: string };

const map = inject(mainMapkey);
const overlays = ref<OverlayData[]>([]);
const contactsLayer = ref<ContactsLayer>(new ContactsLayer(map as Map));

const { isLoading, isError, data } = useContactsData();
const locStore = useLocation();

// update zoom
const updateZoom = ref<{ type: 'zoom-features' | 'zoom-loc'; time: number }>();
let prevZoomUpdate = 0;
watchEffect(() => {
  if (!updateZoom.value) return;
  const zoom = updateZoom.value.time;
  const loc = locStore.lastLocation;

  if (prevZoomUpdate !== zoom) {
    requestAnimationFrame(() => {
      if (updateZoom.value?.type === 'zoom-features') {
        contactsLayer.value?.fitToSource();
        prevZoomUpdate = zoom;
      }

      if (updateZoom.value?.type === 'zoom-loc') {
        if (!loc) return;
        contactsLayer.value.fitToLoc(loc);
        prevZoomUpdate = zoom;
      }
    });
  }
});

// update data
watchEffect(() => {
  const features = contactsLayer.value?.update(data.value);
  if (features.length > 0) {
    updateZoom.value = {
      type: 'zoom-features',
      time: new Date().getTime(),
    };
  } else {
    updateZoom.value = {
      type: 'zoom-loc',
      time: new Date().getTime(),
    };
  }

  const overlaysData: OverlayData[] = [];
  for (const feature of features) {
    const geom = feature.getGeometry();
    const geomType = geom?.getType();

    if (geomType !== 'Point') continue;

    const message = feature.getProperties()['message'];
    if (!message) continue;

    const point = geom as Point;
    const coordinates = point.getCoordinates();
    overlaysData.push({
      coordinates,
      message,
      key: `${coordinates[0]},${coordinates[1]}`,
    });
  }
  overlays.value = overlaysData;
});
</script>

<template>
  <div v-if="isError" class="z-10 absolute inset-14">
    <ErrorCard
      v-if="isError"
      title=""
      :content="$t('message.errorFetchingData')"
    ></ErrorCard>
  </div>
  <div v-if="isLoading" class="z-10 absolute inset-0">
    <SpinnerDisplay :isLoading="isLoading"></SpinnerDisplay>
  </div>

  <!-- eslint-disable -->
  <OlOverlay
    v-if="overlays.length > 0"
    v-for="item of overlays"
    :key="item.key"
    :position="item.coordinates"
  >
    <div class="font-semibold text-xs p-3">
      <p>{{ $t(`message.${item.message}`) }}</p>
    </div>
  </OlOverlay>
  <!-- eslint-enable -->
</template>
