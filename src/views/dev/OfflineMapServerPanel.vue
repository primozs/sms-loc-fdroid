<script lang="ts" setup>
import { IonButton, IonItem, IonLabel, IonText } from '@ionic/vue';
import { Capacitor } from '@capacitor/core';
import { ref } from 'vue';
import { useUseBaseLayers } from '@/map/baseLayers';
import {
  OfflineMapServer,
  OFFLINE_FIXTURE_CENTER,
  OFFLINE_FIXTURE_ZOOM,
  offlineFixtureStyleUrl,
} from '@/plugins/offlineMapServer';
import { logError } from '@/services/useLogger';

const layers = useUseBaseLayers();
const status = ref('idle');
const baseUrl = ref('');
const available = ref<boolean | null>(null);

const refreshAvailable = async () => {
  if (!Capacitor.isNativePlatform()) {
    available.value = false;
    status.value = 'web — native only';
    return;
  }
  try {
    const ret = await OfflineMapServer.isAvailable();
    available.value = ret.available;
    status.value = ret.available
      ? 'native lib ready'
      : `lib missing: ${ret.error ?? 'unknown'}`;
  } catch (e) {
    available.value = false;
    status.value = String(e);
  }
};

const smokeFetch = async (url: string) => {
  const healthy = await fetch(`${url}/healthy`);
  if (!healthy.ok) throw new Error(`/healthy ${healthy.status}`);
  const styleUrl = offlineFixtureStyleUrl(url);
  const style = await fetch(styleUrl);
  if (!style.ok) throw new Error(`style ${style.status}`);
  const geo = await fetch(styleUrl.replace(/style\.json$/, 'data.geojson'));
  if (!geo.ok) throw new Error(`geojson ${geo.status}`);
  return styleUrl;
};

const start = async () => {
  try {
    // fixture:true → filesDir/offline-map-fixture (separate from product pack root).
    const ret = await OfflineMapServer.start({
      rootDir: '',
      host: '127.0.0.1',
      port: 4000,
      fixture: true,
    });
    baseUrl.value = ret.baseUrl;
    const styleUrl = await smokeFetch(ret.baseUrl);
    status.value = `started — smoke OK ${styleUrl}`;
  } catch (e) {
    logError(e);
    status.value = String(e);
  }
};

const applyToMap = async () => {
  try {
    let url = baseUrl.value;
    if (!url) {
      const ret = await OfflineMapServer.getBaseUrl();
      url = ret.baseUrl;
      baseUrl.value = url;
    }
    if (!url) throw new Error('server not started');
    const styleUrl = offlineFixtureStyleUrl(url);
    await smokeFetch(url);
    layers.setStyleUrlOverride(styleUrl);
    status.value = `map override → ${styleUrl} (center ${OFFLINE_FIXTURE_CENTER}, z${OFFLINE_FIXTURE_ZOOM})`;
  } catch (e) {
    logError(e);
    status.value = String(e);
  }
};

const stop = async () => {
  try {
    layers.setStyleUrlOverride(null);
    await OfflineMapServer.stop();
    baseUrl.value = '';
    status.value = 'stopped — online style restored';
  } catch (e) {
    logError(e);
    status.value = String(e);
  }
};

refreshAvailable();
</script>

<template>
  <IonItem lines="full">
    <IonLabel class="ion-text-wrap">
      <h2>OfflineMapServer (dev)</h2>
      <IonText color="medium">
        <p>{{ status }}</p>
        <p v-if="baseUrl">{{ baseUrl }}</p>
        <p>available: {{ available }}</p>
        <p v-if="layers.styleUrlOverride">
          override: {{ layers.styleUrlOverride }}
        </p>
      </IonText>
    </IonLabel>
  </IonItem>
  <IonItem lines="full">
    <IonButton slot="start" size="small" @click="refreshAvailable"
      >Check lib</IonButton
    >
    <IonButton slot="start" size="small" @click="start">Start</IonButton>
    <IonButton slot="start" size="small" @click="applyToMap"
      >Use on map</IonButton
    >
    <IonButton slot="end" size="small" fill="outline" @click="stop"
      >Stop</IonButton
    >
  </IonItem>
</template>
