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
  IonMenuToggle,
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
      <div class="menu-body">
        <IonList>
          <IonMenuToggle auto-hide>
            <IonItem
              router-link="/contacts/list"
              router-direction="root"
              button
              :detail="false"
              lines="full"
            >
              <IonIcon slot="start" :icon="peopleCircleOutline"></IonIcon>
              <IonLabel>
                {{ $t('message.contacts') }}
              </IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle auto-hide>
            <IonItem
              router-link="/contacts/map"
              router-direction="root"
              button
              :detail="false"
              lines="full"
            >
              <IonIcon slot="start" :icon="mapOutline"></IonIcon>
              <IonLabel>
                {{ $t('message.map') }}
              </IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle auto-hide>
            <IonItem
              router-link="/contacts/settings"
              router-direction="root"
              button
              :detail="false"
              lines="full"
            >
              <IonIcon slot="start" :icon="optionsOutline"></IonIcon>
              <IonLabel>
                {{ $t('message.settings') }}
              </IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>

        <IonList class="menu-footer">
          <IonMenuToggle auto-hide>
            <IonItem
              router-link="/about"
              router-direction="forward"
              button
              :detail="false"
              lines="full"
            >
              <IonIcon slot="start" :icon="helpCircleOutline"></IonIcon>
              <IonLabel>
                {{ $t('message.about') }}
              </IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle auto-hide>
            <IonItem
              router-link="/support"
              router-direction="forward"
              button
              :detail="false"
              lines="full"
            >
              <IonIcon slot="start" :icon="informationCircleOutline"></IonIcon>
              <IonLabel>
                {{ $t('message.support') }}
              </IonLabel>
            </IonItem>
          </IonMenuToggle>

          <IonMenuToggle auto-hide>
            <IonItem
              router-link="/terms-of-use"
              router-direction="forward"
              button
              :detail="false"
              lines="full"
            >
              <IonIcon slot="start" :icon="bodyOutline"></IonIcon>
              <IonLabel>
                {{ $t('message.privacyPolicy') }}
              </IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>
      </div>
    </IonContent>
  </IonMenu>
</template>

<style scoped>
.menu-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.menu-footer {
  margin-top: auto;
  border-top: 1px solid var(--ion-border-color);
}
</style>
