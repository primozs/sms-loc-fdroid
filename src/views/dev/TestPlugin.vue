<script lang="ts" setup>
import { IonFab, IonFabButton, IonIcon, toastController } from '@ionic/vue';
import { starOutline, stopOutline } from 'ionicons/icons';
import { GeoLocation } from '@/plugins/geolocation';
import { ref } from 'vue';
import { logError } from '@/services/useLogger';

const watchId = ref();

const handler = async () => {
  try {
    await GeoLocation.requestPermissions();
    watchId.value = await GeoLocation.addBackgroundWatcher({}, (location) => {
      console.log('location', location);
    });
  } catch (error: any) {
    const toast = await toastController.create({
      message: error?.message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
    logError(error);
  }
};

const handler1 = async () => {
  try {
    GeoLocation.removeBackgroundWatcher({ id: watchId.value });
  } catch (error: any) {
    const toast = await toastController.create({
      message: error?.message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
    logError(error);
  }
};

const handler2 = async () => {
  try {
    console.log('hello');
  } catch (error: any) {
    const toast = await toastController.create({
      message: error?.message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
    logError(error);
  }
};
</script>

<template>
  <IonFab slot="fixed" horizontal="start" vertical="bottom">
    <IonFabButton @click="handler">
      <IonIcon :icon="starOutline"></IonIcon>
    </IonFabButton>
  </IonFab>

  <IonFab slot="fixed" horizontal="center" vertical="bottom">
    <IonFabButton @click="handler1">
      <IonIcon :icon="stopOutline"></IonIcon>
    </IonFabButton>

  </IonFab>

  <IonFab slot="fixed" horizontal="center" vertical="center">
    <IonFabButton @click="handler2">
      <IonIcon :icon="stopOutline"></IonIcon>
    </IonFabButton>
  </IonFab>
</template>
