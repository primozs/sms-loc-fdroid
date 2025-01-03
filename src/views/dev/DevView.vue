<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonBackButton,
  IonTitle,
  IonButtons,
  // IonList,
  // IonAccordionGroup,
  // IonAccordion,
} from '@ionic/vue';
// import TestPlugin from './TestPlugin.vue';
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="mr-2">
          <IonBackButton></IonBackButton>
        </IonButtons>
        <IonTitle>DEV</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :scroll-y="false">
      <!-- <TestPlugin /> -->

      <!-- <IonAccordionGroup :multiple="false" :value="station.id"> -->
      <!--   <IonAccordion :value="station.id"> -->
      <!--     <WeatherStationItem :station="station" /> -->
      <!--   </IonAccordion> -->
      <!-- </IonAccordionGroup> -->

      <!-- <IonList>
        <WeatherStationItem :station="station" />
      </IonList> -->
    </IonContent>
  </IonPage>
</template>
