<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonMenuButton,
  IonTitle,
  IonButtons,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonListHeader,
} from '@ionic/vue';
import { readerOutline } from 'ionicons/icons';
import DarkMode from './DarkMode.vue';
import SelectLocale from './SelectLocale.vue';
import { config } from '@/config';
import Link from '@/components/Link.vue';
import { useDevMode, useDevSwitcher } from '@/views/dev/useDevMode';
import OfflineMaps from './OfflineMaps.vue';
import SelectBaseLayer from './SelectBaseLayer.vue';
// import DevPanel from '@/views/dev/DevPanel.vue';

const { devClickHandler } = useDevSwitcher();
const dev = useDevMode();
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="mr-2">
          <IonMenuButton />
        </IonButtons>
        <IonTitle @click="devClickHandler">
          {{ $t('message.settings') }}
        </IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true" color="light">
      <IonList :inset="true">
        <SelectLocale />
        <DarkMode />
      </IonList>

      <IonList :inset="true">
        <SelectBaseLayer />
      </IonList>

      <IonList :inset="true" v-if="dev.isDevMode">
        <IonListHeader class="text-lg leading-6 font-semibold">
          <IonLabel>DEVELOPMENT</IonLabel>
        </IonListHeader>

      </IonList>

      <IonList :inset="true">
        <!-- <DevPanel /> -->

        <OfflineMaps />

        <Link router-link="/logs">
        <IonItem button :detail="false" lines="full">
          <IonIcon slot="start" :icon="readerOutline"></IonIcon>
          <IonLabel>
            {{ $t('message.logs') }}
            <p>
              {{ $t('message.version') }}: {{ config.APPLICATION_VERSION }}
            </p>
          </IonLabel>
        </IonItem>
        </Link>
      </IonList>
    </IonContent>
  </IonPage>
</template>
