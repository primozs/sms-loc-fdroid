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
import 'ol/ol.css';
import OlContactFeatures from '@/views/contacts/OlContactFeatures.vue';
import OlMyLocation from './OlMyLocation.vue';
import OlMap from '@/map/OlMap.vue';
import MlMapAwaiter from '@/map/MlMapAwaiter.vue';
import MapModalData from './MapModalData.vue';
import { useDevMode } from '@/views/dev/useDevMode';

const dev = useDevMode();
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="mr-2">
          <IonMenuButton />
        </IonButtons>
        <IonTitle>SMSLoc</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <OlMap v-if="dev.isDevMode">
        <OlContactFeatures />
        <OlMyLocation />
        <MlMapAwaiter>
          <MapModalData />
        </MlMapAwaiter>
      </OlMap>

      <OlMap v-else>
        <OlContactFeatures />
        <OlMyLocation />
      </OlMap>
    </IonContent>
  </IonPage>
</template>
