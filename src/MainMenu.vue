<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonMenu,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonList,
  IonIcon,
  IonButtons,
  IonButton,
} from '@ionic/vue';
import {
  informationCircleOutline,
  helpCircleOutline,
  closeOutline,
  bodyOutline,
  peopleCircleOutline,
  mapOutline,
  optionsOutline,
} from 'ionicons/icons';
import { menuController } from '@ionic/core/components';
import { onMounted, ref } from 'vue';
import Link from '@/components/Link.vue';

const props = defineProps<{ contentId: string }>();
const menu = ref<typeof menuController | undefined>();

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
  <IonMenu :content-id="props.contentId" id="app-menu">
    <IonHeader>
      <IonToolbar>
        <IonTitle>
          {{ $t('message.appname') }}
        </IonTitle>
        <IonButtons slot="end">
          <IonButton @click="close" color="medium">
            <IonIcon slot="end" :icon="closeOutline"></IonIcon>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent :fullscreen="true">
      <IonList class="flex flex-col h-full">
        <Link router-link="/contacts/list" :callback="close">
          <IonItem button :detail="false" lines="full">
            <IonIcon slot="start" :icon="peopleCircleOutline"></IonIcon>
            <IonLabel>
              {{ $t('message.contacts') }}
            </IonLabel>
          </IonItem>
        </Link>

        <Link router-link="/contacts/map" :callback="close">
          <IonItem button :detail="false" lines="full">
            <IonIcon slot="start" :icon="mapOutline"></IonIcon>
            <IonLabel>
              {{ $t('message.map') }}
            </IonLabel>
          </IonItem>
        </Link>

        <Link router-link="/contacts/settings" :callback="close">
          <IonItem button :detail="false" lines="full">
            <IonIcon slot="start" :icon="optionsOutline"></IonIcon>
            <IonLabel>
              {{ $t('message.settings') }}
            </IonLabel>
          </IonItem>
        </Link>

        <Link
          router-link="/about"
          :callback="close"
          class="border-t border-gray-200 dark:border-gray-900 mt-auto"
        >
          <IonItem button :detail="false" lines="full">
            <IonIcon slot="start" :icon="helpCircleOutline"></IonIcon>
            <IonLabel>
              {{ $t('message.about') }}
            </IonLabel>
          </IonItem>
        </Link>

        <Link router-link="/support" :callback="close">
          <IonItem button :detail="false" lines="full">
            <IonIcon slot="start" :icon="informationCircleOutline"></IonIcon>
            <IonLabel>
              {{ $t('message.support') }}
            </IonLabel>
          </IonItem>
        </Link>

        <Link router-link="/terms-of-use" :callback="close">
          <IonItem button :detail="false" lines="full">
            <IonIcon slot="start" :icon="bodyOutline"></IonIcon>
            <IonLabel>
              {{ $t('message.privacyPolicy') }}
            </IonLabel>
          </IonItem>
        </Link>
      </IonList>
    </IonContent>
  </IonMenu>
</template>
