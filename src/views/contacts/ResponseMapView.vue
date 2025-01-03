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
import OlMap from '@/map/OlMap.vue';
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="mr-2">
          <IonBackButton />
        </IonButtons>
        <IonTitle>{{ $t('message.location') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <OlMap>
        <OlResponseMapLocation />
      </OlMap>
    </IonContent>
  </IonPage>
</template>
