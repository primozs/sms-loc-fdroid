<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonBackButton,
  IonTitle,
  IonButtons,
  IonList,
} from '@ionic/vue';
import OfflineMapServerPanel from './OfflineMapServerPanel.vue';
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="app-menu-btn-gap">
          <IonBackButton></IonBackButton>
        </IonButtons>
        <IonTitle>DEV</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :scroll-y="true">
      <IonList>
        <OfflineMapServerPanel />
      </IonList>
    </IonContent>
  </IonPage>
</template>
