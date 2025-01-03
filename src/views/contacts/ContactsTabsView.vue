<script lang="ts" setup>
import {
  IonPage,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonIcon,
} from '@ionic/vue';
import {
  peopleCircleOutline,
  mapOutline,
  optionsOutline,
} from 'ionicons/icons';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <IonPage>
    <IonTabs>
      <IonRouterOutlet />

      <IonTabBar
        slot="bottom"
        class="pb-1 pt-2 border-t border-gray-200 dark:border-gray-950"
      >
        <IonTabButton tab="contacts" href="/contacts/list">
          <IonIcon :icon="peopleCircleOutline" />
          <IonLabel>{{ t('message.contacts') }}</IonLabel>
        </IonTabButton>

        <IonTabButton tab="map" href="/contacts/map">
          <IonIcon :icon="mapOutline" />
          <IonLabel>{{ t('message.map') }}</IonLabel>
        </IonTabButton>

        <IonTabButton tab="settings" href="/contacts/settings">
          <IonIcon :icon="optionsOutline" />
          <IonLabel>{{ t('message.settings') }}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  </IonPage>
</template>
