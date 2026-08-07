<script lang="ts" setup>
import { IonItem, IonLabel, IonIcon } from '@ionic/vue';
import { bugOutline } from 'ionicons/icons';
import { usePresentation } from '@/views/presentation/usePresentation';

const presentation = usePresentation();

const togglePresentation = () => {
  presentation.setPresentationViewed(!presentation.beenViewed);
};
</script>

<template>
  <IonItem router-link="/dev" button :detail="false" lines="full">
    <IonIcon slot="start" :icon="bugOutline"></IonIcon>
    <IonLabel>Development</IonLabel>
  </IonItem>

  <IonItem router-link="/presentation" button :detail="false" lines="full">
    <IonLabel> PRESENTATION </IonLabel>
  </IonItem>

  <IonItem button :detail="false" lines="full" @click="togglePresentation">
    <IonLabel> PRESENTATION VIEWED: {{ presentation.beenViewed }} </IonLabel>
  </IonItem>
</template>
