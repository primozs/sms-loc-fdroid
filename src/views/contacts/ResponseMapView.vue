<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonBackButton,
  onIonViewDidEnter,
} from '@ionic/vue';
import { useRoute } from 'vue-router';
import ResponseMapLocation from './ResponseMapLocation.vue';
import MlMap from '@/map/MlMap.vue';
import { whenElementSized } from '@/map/whenElementSized';
import { ResponseStore } from '@/services/responses';
import type { MapCamera } from '@/map/initialCamera';

const route = useRoute();
const showMap = ref(false);
const sizeProbe = ref<HTMLDivElement>();
const openCamera = ref<MapCamera>();

const revealMapWhenSized = async () => {
  if (showMap.value) return;
  const probe = sizeProbe.value;
  if (!probe) return;
  await whenElementSized(probe);

  const id = Number(route.params.id);
  if (!Number.isNaN(id)) {
    const response = await ResponseStore.getInstance().getResponseById(id);
    if (response) {
      openCamera.value = {
        center: [response.lon, response.lat],
        zoom: 12,
      };
    }
  }

  showMap.value = true;
};

onMounted(() => {
  revealMapWhenSized();
});

onIonViewDidEnter(() => {
  revealMapWhenSized();
});
</script>

<template>
  <IonPage class="map-ion-page">
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="app-menu-btn-gap">
          <IonBackButton />
        </IonButtons>
        <IonTitle>{{ $t('message.location') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :scroll-y="false" class="map-page-content" :fullscreen="false">
      <div ref="sizeProbe" class="map-size-probe" aria-hidden="true"></div>
      <MlMap
        v-if="showMap"
        :initial-center="openCamera?.center"
        :initial-zoom="openCamera?.zoom"
      >
        <ResponseMapLocation :skip-initial-fit="!!openCamera" />
      </MlMap>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.map-ion-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.map-page-content {
  flex: 1;
  min-height: 0;
  --overflow: hidden;
}
/* Positioning context for absolute-fill MlMap */
.map-page-content::part(scroll) {
  position: relative;
  height: 100%;
}
.map-size-probe {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
