<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonMenuButton,
  IonButtons,
  IonTitle,
  onIonViewDidEnter,
} from '@ionic/vue';
import ContactFeatures from '@/views/contacts/ContactFeatures.vue';
import MyLocation from './MyLocation.vue';
import MlMap from '@/map/MlMap.vue';
import MapModalData from './MapModalData.vue';
import SpinnerDisplay from '@/components/SpinnerDisplay.vue';
import ErrorCard from '@/components/ErrorCard.vue';
import { useDevMode } from '@/views/dev/useDevMode';
import { whenElementSized } from '@/map/whenElementSized';
import { useContactsData } from '@/services/useContactsData';
import { useLocation } from '@/services/useLocation';
import {
  cameraFromContactsOrLocation,
  type MapCamera,
} from '@/map/initialCamera';

const dev = useDevMode();
const { data } = useContactsData();
const locStore = useLocation();

const showMap = ref(false);
const mapReady = ref(false);
const mapStyleError = ref(false);
const sizeProbe = ref<HTMLDivElement>();
/** Snapshot when map is first shown — passed into `new Map()`. */
const openCamera = ref<MapCamera>();
/** Bump on later tab enters so the live map recenters. */
const focusKey = ref(0);

const isLoading = computed(
  () => !showMap.value || (!mapReady.value && !mapStyleError.value),
);

const onMapStyleError = () => {
  mapStyleError.value = true;
};

const revealOrRefocus = async () => {
  const probe = sizeProbe.value;
  if (!probe) return;
  await whenElementSized(probe);
  const camera = cameraFromContactsOrLocation(
    data.value,
    locStore.lastLocation,
  );

  if (!showMap.value) {
    mapStyleError.value = false;
    mapReady.value = false;
    openCamera.value = camera;
    showMap.value = true;
    if (!camera) {
      void locStore.getLocation().then(() => {
        focusKey.value += 1;
      });
    }
    return;
  }

  focusKey.value += 1;
};

onMounted(() => {
  revealOrRefocus();
});

onIonViewDidEnter(() => {
  revealOrRefocus();
});
</script>

<template>
  <IonPage class="map-ion-page">
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="app-menu-btn-gap">
          <IonMenuButton />
        </IonButtons>
        <IonTitle>SMSLoc</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :scroll-y="false" class="map-page-content" :fullscreen="false">
      <div ref="sizeProbe" class="map-size-probe" aria-hidden="true"></div>
      <div v-if="isLoading" class="app-overlay app-overlay--full">
        <SpinnerDisplay />
      </div>
      <div v-if="mapStyleError" class="app-overlay app-overlay--inset">
        <ErrorCard
          title=""
          :content="$t('message.mapUnavailableHint')"
        ></ErrorCard>
      </div>
      <MlMap
        v-if="showMap"
        :initial-center="openCamera?.center"
        :initial-zoom="openCamera?.zoom"
        @ready="mapReady = true"
        @style-error="onMapStyleError"
      >
        <ContactFeatures
          :skip-initial-fit="!!openCamera"
          :focus-key="focusKey"
        />
        <MyLocation />
        <MapModalData v-if="dev.isDevMode" />
      </MlMap>
    </IonContent>
  </IonPage>
</template>

<style scoped>
/* IonPage fills the tabs outlet (area above tab bar) */
.map-ion-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.map-page-content {
  flex: 1;
  min-height: 0;
  --overflow: hidden;
}
/* Positioning context for absolute-fill MlMap */
.map-page-content::part(scroll) {
  position: relative;
  height: 100%;
}
.map-size-probe {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
