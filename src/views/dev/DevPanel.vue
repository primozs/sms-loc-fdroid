<script lang="ts" setup>
import { IonItem, IonLabel, IonIcon } from '@ionic/vue';
import { bugOutline } from 'ionicons/icons';
import { menuController } from '@ionic/core/components';
import { onMounted, ref } from 'vue';
import Link from '@/components/Link.vue';
import ServerStatus from './ServerStatus.vue';
import { usePresentation } from '@/views/presentation/usePresentation';

const menu = ref<typeof menuController | undefined>();
const presentation = usePresentation();

const togglePresentation = () => {
  presentation.setPresentationViewed(!presentation.beenViewed);
};

onMounted(async () => {
  const m = document.getElementById(
    'app-menu',
  ) as unknown as typeof menuController;
  menu.value = m;
});

const close = async () => {
  await menu.value?.close();
};
</script>

<template>
  <ServerStatus />

  <Link router-link="/dev" :callback="close">
    <IonItem button :detail="false" lines="full">
      <IonIcon slot="start" :icon="bugOutline"></IonIcon>
      <IonLabel>Development</IonLabel>
    </IonItem>
  </Link>

  <Link router-link="/presentation" :callback="close">
    <IonItem button :detail="false" lines="full">
      <IonLabel> PRESENTATION </IonLabel>
    </IonItem>
  </Link>

  <IonItem button :detail="false" lines="full" @click="togglePresentation">
    <IonLabel> PRESENTATION VIEWED: {{ presentation.beenViewed }} </IonLabel>
  </IonItem>
</template>
