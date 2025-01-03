<script lang="ts" setup>
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
  toastController,
} from '@ionic/vue';
import {
  arrowDownOutline,
  accessibilityOutline,
  bandageOutline,
  heartOutline,
  arrowRedoOutline,
  thumbsUpOutline,
  sadOutline,
  partlySunnyOutline,
} from 'ionicons/icons';
import { useI18n } from 'vue-i18n';
import { useModalSendSms } from './useModalSendSms';
import { ref } from 'vue';
import { logError } from '@/services/useLogger';
import { ResponseStore, type MessageType } from '@/services/responses';
import { useLocation } from '@/services/useLocation';
import { Device } from '@capacitor/device';
import { gpsToSmsText, toGpsData, ResponseData } from '@/services/responses';
import { SMS } from '@/plugins/sms';
import { Alert } from '@/components/Alert';

const { t } = useI18n();
const isError = ref(false);
const modalStore = useModalSendSms();
const { getLocation } = useLocation();

const handleClose = () => {
  modalStore.setContactModel(null);
};

const actions: MessageType[] = [
  'GO_FLY',
  'ALL_OK',
  'ON_MY_WAY',
  'NEED_RETREIVE',
  'NEED_HELP',
  'OK',
  'CAN_NOT',
];

const getIcon = (action: MessageType) => {
  const icons: Record<MessageType, string> = {
    GO_FLY: partlySunnyOutline,
    ALL_OK: accessibilityOutline,
    ON_MY_WAY: arrowRedoOutline,
    NEED_RETREIVE: heartOutline,
    NEED_HELP: bandageOutline,
    OK: thumbsUpOutline,
    CAN_NOT: sadOutline,
  };
  return icons[action];
};

const getText = (action: MessageType) => {
  return t(`message.${action}`);
};

const handleAction = async (action: MessageType) => {
  const { value } = await Alert.confirm({
    title: t('message.sendMessage'),
    subHeader: getText(action),
    message: '',
    okLabel: t('message.confirm'),
    cancelLabel: t('message.cancel'),
  });

  if (!value) return;

  try {
    const address = modalStore.contact?.address;
    const contactId = modalStore.contact?.contactId;
    if (!address || !contactId) {
      const error = new Error('NO_ADDRESS');
      logError(error);
      throw error;
    }

    const position = await getLocation();
    if (!position) {
      const error = new Error('NO_GPS_LOC');
      logError(error);
      throw error;
    }

    const batInfo = await Device.getBatteryInfo();
    const battery =
      batInfo.batteryLevel === undefined
        ? undefined
        : batInfo.batteryLevel * 100;

    const gpsData = toGpsData({
      position,
      battery,
      message: action,
    });

    const message = gpsToSmsText(gpsData);

    SMS.sendSms({
      address,
      message,
    });

    const response: Omit<ResponseData, 'id'> = {
      type: 'sent', // msg
      contactId,
      address,
      ...gpsData,
    };
    ResponseStore.getInstance().addResponse(response);

    const toast = await toastController.create({
      message: t('message.smsWasSent'),
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    logError(error);
    isError.value = true;
  }
};
const handleDismiss = () => {
  modalStore.setContactModel(null);
};
</script>

<template>
  <IonModal :is-open="!!modalStore.contact" @ionModalDidDismiss="handleDismiss">
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start">
          <IonButton @click="handleClose">
            <IonIcon slot="icon-only" :icon="arrowDownOutline" />
          </IonButton>
        </IonButtons>
        <IonTitle>{{ t('message.sendMessage') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonHeader v-if="isError">
      <IonToolbar color="danger">
        <IonTitle class="text-gray-900">{{
          t('message.sendMessageError')
        }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      <IonList lines="full">
        <IonItem
          :button="true"
          :detail="false"
          v-for="action in actions"
          :key="action"
          @click="handleAction(action)"
        >
          <IonIcon slot="start" :icon="getIcon(action)"></IonIcon>
          <IonLabel>
            <strong> {{ getText(action) }}</strong>
          </IonLabel>
        </IonItem>
      </IonList>
    </IonContent>
  </IonModal>
</template>
