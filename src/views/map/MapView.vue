<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonMenuButton,
  IonButtons,
  IonTitle,
} from '@ionic/vue';
import OlContactFeatures from '@/views/contacts/OlContactFeatures.vue';
import OlMyLocation from './OlMyLocation.vue';
import MlMap from '@/map/MlMap.vue';
import MapModalData from './MapModalData.vue';
import { useDevMode } from '@/views/dev/useDevMode';

const dev = useDevMode();
</script>

<template>
  <IonPage class="map-ion-page">
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="mr-2">
          <IonMenuButton />
        </IonButtons>
        <IonTitle>SMSLoc</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :scroll-y="false" class="map-page-content" :fullscreen="false">
      <MlMap>
        <OlContactFeatures />
        <OlMyLocation />
        <MapModalData v-if="dev.isDevMode" />
      </MlMap>
    </IonContent>
  </IonPage>
</template>

<style scoped>
/* IonPage fills the tabs outlet (area above tab bar) */
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
/* Scroll host becomes the sized parent MapLibre needs (height: 100%) */
.map-page-content::part(scroll) {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
