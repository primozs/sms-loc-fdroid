<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonBackButton,
} from '@ionic/vue';
import OlResponseMapLocation from './OlResponseMapLocation.vue';
import MlMap from '@/map/MlMap.vue';
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
      <MlMap>
        <OlResponseMapLocation />
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
.map-page-content::part(scroll) {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
