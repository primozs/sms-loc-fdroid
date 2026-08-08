<script lang="ts" setup>
import {
  IonItem,
  IonIcon,
  IonButton,
  IonProgressBar,
  IonText,
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
  if (!p || p.transferred === undefined) return '~300 MB';
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
    <div class="flex flex-col gap-y-1.5 w-full py-3">
      <div class="flex flex-col h-8 relative">
        <IonText class="text-xs leading-5">
          {{ t('message.offlineMaps') }}
        </IonText>
        <IonText class="text-[9px] leading-3 transform-gpu">
          {{ formatProgress(installProgress) }}
        </IonText>
      </div>
      <div class="mr-3">
        <IonProgressBar
          :value="installProgress?.percent"
          :color="downloading ? 'primary' : 'medium'"
        />
      </div>
    </div>

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
