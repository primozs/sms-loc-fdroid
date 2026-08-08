<script lang="ts" setup>
import {
  IonItem,
  IonIcon,
  IonButton,
  IonProgressBar,
  IonLabel,
} from '@ionic/vue';
import { checkmarkCircleOutline, downloadOutline } from 'ionicons/icons';
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Capacitor } from '@capacitor/core';
import { config } from '@/config';
import {
  OfflineMapServer,
  bootstrapOfflineMaps,
  type OfflineMapProgress,
} from '@/plugins/offlineMapServer';
import { useUseBaseLayers } from '@/map/baseLayers';
import { Alert } from '@/components/Alert';
import { logError } from '@/services/useLogger';

const { t } = useI18n();
const layers = useUseBaseLayers();

const mapsInstalled = ref(false);
const downloading = ref(false);
const buttonDisabled = ref(false);
const installProgress = ref<OfflineMapProgress>();
let progressHandle: { remove: () => Promise<void> } | undefined;

const formatBytes = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const formatProgress = (p: OfflineMapProgress | undefined) => {
  if (!p || p.transferred === undefined) return '~ 300 MB';
  const percentN = Math.round((p.percent ?? 0) * 100);
  if (percentN >= 100) return t('message.installing');
  const total = p.total > 0 ? formatBytes(p.total) : '?';
  return `${percentN}% ${formatBytes(p.transferred)} / ${total}`;
};

const refreshStatus = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const st = await OfflineMapServer.getPackStatus();
    mapsInstalled.value = st.installed;
    downloading.value = !!st.busy;
  } catch (e) {
    logError(e);
  }
};

const handleClick = async () => {
  if (!Capacitor.isNativePlatform()) return;
  buttonDisabled.value = true;
  try {
    if (mapsInstalled.value) {
      const { value } = await Alert.confirm({
        title: t('message.delete'),
        message: t('message.areYouSure'),
        okLabel: t('message.confirm'),
        cancelLabel: t('message.cancel'),
      });
      if (!value) return;
      await OfflineMapServer.removePack();
      layers.setStyleUrlOverride(null);
      mapsInstalled.value = false;
      installProgress.value = undefined;
    } else if (downloading.value) {
      await OfflineMapServer.cancelInstall();
      downloading.value = false;
      installProgress.value = undefined;
    } else {
      downloading.value = true;
      installProgress.value = { percent: 0, transferred: 0, total: 0 };
      await OfflineMapServer.installPack({
        url: config.OFFLINE_MAP_DOWNLOAD_URL,
      });
      mapsInstalled.value = true;
      downloading.value = false;
      installProgress.value = undefined;
      await bootstrapOfflineMaps();
    }
  } catch (e) {
    logError(e);
    downloading.value = false;
    await refreshStatus();
  } finally {
    buttonDisabled.value = false;
  }
};

onMounted(async () => {
  await refreshStatus();
  if (!Capacitor.isNativePlatform()) return;
  progressHandle = await OfflineMapServer.addListener(
    'offlineMapProgress',
    (p) => {
      installProgress.value = p;
      downloading.value = true;
    },
  );
});

onUnmounted(() => {
  void progressHandle?.remove();
});
</script>

<template>
  <IonItem lines="full">
    <IonIcon
      slot="start"
      :color="mapsInstalled ? 'success' : ''"
      :icon="mapsInstalled ? checkmarkCircleOutline : downloadOutline"
    ></IonIcon>
    <IonLabel class="offline-maps-label">
      <h2>{{ t('message.offlineMaps') }}</h2>
      <p>{{ formatProgress(installProgress) }}</p>
      <IonProgressBar
        class="offline-maps-bar"
        :value="installProgress?.percent"
        :color="downloading ? 'primary' : 'medium'"
      />
    </IonLabel>
    <IonButton
      slot="end"
      @click="handleClick"
      :color="mapsInstalled ? 'danger' : downloading ? 'warning' : 'primary'"
      :disabled="buttonDisabled"
    >
      {{
        mapsInstalled
          ? t('message.remove')
          : downloading
            ? t('message.cancel')
            : t('message.download')
      }}
    </IonButton>
  </IonItem>
</template>

<style scoped>
.offline-maps-label h2 {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  font-weight: 400;
}

.offline-maps-label p {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
}

.offline-maps-bar {
  margin-top: 0.25rem;
}
</style>
