<script lang="ts" setup>
import {
  IonItem,
  IonIcon,
  IonButton,
  IonProgressBar,
  IonText,
  toastController,
} from '@ionic/vue';
import { checkmarkCircleOutline, downloadOutline } from 'ionicons/icons';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { NodeJS } from 'capacitor-nodejs';
import { logDebug, logError } from '@/services/useLogger';
import { Capacitor } from '@capacitor/core';
import prettyBytes from 'pretty-bytes';
import { Alert } from '@/components/Alert';

const { t } = useI18n();

type ProgressEv = {
  percent: number;
  transferred: number;
  total: number;
};

type OfflineChannelAction = 'install' | 'status' | 'remove' | 'installCancel';
type ProgressAct = ['progress', ProgressEv];
type InstalledAct = ['installed', boolean];
type RemovedAct = ['removed', boolean];
type InstallErrorAct = ['install_error', Error];
type StatusErrorAct = ['status_error', Error];
type RemoveErrorAct = ['remove_error', Error];
type MessageAct = ['message', string];
type StatusAct = ['status', boolean, Record<string, any>];

type ResponseActionType =
  | ProgressAct
  | InstalledAct
  | RemovedAct
  | InstallErrorAct
  | RemoveErrorAct
  | StatusErrorAct
  | MessageAct
  | StatusAct;

const canceled = ref(false);
const downloading = ref(false);
const installProgress = ref<ProgressEv>();
const mapsInstalled = ref(false);
const buttonDisabled = ref(false);

const offlineMapsSendAction = async (action: OfflineChannelAction) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await NodeJS.whenReady();
    await NodeJS.send({
      eventName: 'offline-maps-channel-node',
      args: [action],
    });
  } catch (error) {
    logError(error);
  }
};

const handleClick = async () => {
  if (mapsInstalled.value) {
    buttonDisabled.value = true;

    const { value } = await Alert.confirm({
      title: t('message.delete'),
      message: t('message.areYouSure'),
      okLabel: t('message.confirm'),
      cancelLabel: t('message.cancel'),
    });

    if (value) {
      await offlineMapsSendAction('remove');
    }
    buttonDisabled.value = false;
  } else if (downloading.value) {
    buttonDisabled.value = true;
    await offlineMapsSendAction('installCancel');
    buttonDisabled.value = false;

    mapsInstalled.value = false;
    downloading.value = false;
    canceled.value = true;
  } else {
    buttonDisabled.value = true;
    await offlineMapsSendAction('install');
    buttonDisabled.value = false;

    mapsInstalled.value = false;
    downloading.value = true;
  }
};

NodeJS.addListener('offline-maps-channel', async (event) => {
  const [action, payload] = event.args as ResponseActionType;
  switch (action) {
    case 'installed':
    case 'status':
      mapsInstalled.value = payload;
      installProgress.value = undefined;
      downloading.value = false;
      break;
    case 'removed':
      mapsInstalled.value = false;
      break;
    case 'message':
      logDebug('message', payload);
      break;
    case 'install_error':
      mapsInstalled.value = false;
      downloading.value = false;
      installProgress.value = undefined;
    // eslint-disable-next-line
    case 'remove_error':
    case 'status_error':
      logError(payload);

      if (canceled.value) {
        canceled.value = false;
      } else {
        const toast = await toastController.create({
          message: t('message.error'),
          duration: 3000,
          position: 'top',
          color: 'danger',
        });
        await toast.present();
      }
      break;
    default:
  }
});

NodeJS.addListener('offline-maps-channel-progress', async (event) => {
  const [action, payload] = event.args as ResponseActionType;
  if (action === 'progress') {
    installProgress.value = payload;
  }
});

onMounted(async () => {
  offlineMapsSendAction('status');
});

const formatProgress = (p: ProgressEv | undefined) => {
  if (!p || p.transferred === undefined || p.total === undefined)
    return 'cca 300MB';
  const percentN = Math.round(p.percent * 100);
  const percent = percentN + '%';
  const transferred = prettyBytes(p.transferred);
  const total = prettyBytes(p.total);
  if (percentN === 100 || transferred === total) {
    return t('message.installing');
  }
  return `${percent} ${transferred} / ${total}`;
};
</script>

<template>
  <IonItem lines="full">
    <IonIcon slot="start" :color="mapsInstalled ? 'success' : ''"
      :icon="mapsInstalled ? checkmarkCircleOutline : downloadOutline"></IonIcon>
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
        <IonProgressBar :value="installProgress?.percent" :color="downloading ? 'primary' : 'medium'" />
      </div>
    </div>

    <IonButton slot="end" @click="handleClick" :color="mapsInstalled ? 'danger' : downloading ? 'warning' : 'primary'"
      :disabled="buttonDisabled">
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
