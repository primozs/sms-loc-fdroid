<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonBackButton,
  IonTitle,
  IonButtons,
  IonItem,
  IonLabel,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  type RefresherCustomEvent,
  IonIcon,
  IonModal,
  IonButton,
} from '@ionic/vue';
import SpinnerDisplay from '@/components/SpinnerDisplay.vue';
import { useLogsData } from '@/services/useLogsData';
import { useI18n } from 'vue-i18n';
import { computed, ref } from 'vue';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/vue-query';
import { useVirtualList } from '@vueuse/core';
import { LogData, LogStore } from '@/services/logs';
import { arrowDownOutline, trashOutline } from 'ionicons/icons';
import { Alert } from '@/components/Alert';

const { t, locale } = useI18n();
const { isLoading, isError, data } = useLogsData();

const { list, containerProps, wrapperProps } = useVirtualList(data, {
  itemHeight: 83,
  overscan: 10,
});

const format = computed(() => {
  return locale.value === 'sl'
    ? 'DD.MM.YYYY HH:mm:ss'
    : 'YYYY/MM/DD/YY HH:mm:ss';
});

const queryClient = useQueryClient();

const handleRefresh = (event: RefresherCustomEvent) => {
  invalidateRefetchLogs().then(() => {
    event.target.complete();
  });
};

const invalidateRefetchLogs = async () => {
  await queryClient.invalidateQueries({
    queryKey: ['/logs'],
  });
  await queryClient.refetchQueries({
    queryKey: ['/logs'],
  });
};

const selectedLogData = ref<LogData | null>();

const setSelectedLogData = (arg: LogData | null) => {
  selectedLogData.value = arg;
};

const handleDismissModal = () => {
  selectedLogData.value = null;
};

const handleDelete = async () => {
  const { value } = await Alert.confirm({
    title: t('message.deleteAll'),
    message: t('message.areYouSure'),
    okLabel: t('message.confirm'),
    cancelLabel: t('message.cancel'),
  });

  if (value) {
    await LogStore.getInstance().removeAllLogs();
    invalidateRefetchLogs();
  }
};

const handleDeleteItem = async (id: number | undefined) => {
  const { value } = await Alert.confirm({
    title: t('message.delete'),
    message: t('message.areYouSure'),
    okLabel: t('message.confirm'),
    cancelLabel: t('message.cancel'),
  });

  if (value && id) {
    await LogStore.getInstance().deleteLog(id);
    invalidateRefetchLogs();
    selectedLogData.value = null;
  }
};
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="mr-2">
          <IonBackButton></IonBackButton>
        </IonButtons>
        <IonTitle>{{ $t('message.logs') }}</IonTitle>
        <IonButtons slot="end">
          <IonButton @click="handleDelete">
            {{ $t('message.deleteAll') }}
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>

    <IonHeader v-if="isError">
      <IonToolbar color="danger">
        <IonTitle class="text-gray-900">
          {{ $t('message.errorFetchingData') }}
        </IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :scroll-y="false">
      <SpinnerDisplay :isLoading="isLoading"></SpinnerDisplay>

      <IonRefresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
        class="z-10 bg-white dark:bg-black"
      >
        <IonRefresherContent></IonRefresherContent>
      </IonRefresher>

      <section class="overflow-y-auto h-[calc(100%-00px)]">
        <div
          v-if="data.length > 0"
          v-bind="containerProps"
          class="h-full ion-content-scroll-host"
        >
          <div v-bind="wrapperProps">
            <IonItem
              lines="full"
              v-for="item in list"
              :key="item.index"
              class="h-[83px] select-none"
              @click="setSelectedLogData(item.data)"
            >
              <IonLabel>
                <h3>
                  {{ dayjs.unix(item.data.ts / 1000).format(format) }}
                </h3>
                <p>{{ item.data.message }}</p>
                <IonNote>{{ item.data.data }}</IonNote>
              </IonLabel>
            </IonItem>
          </div>
        </div>
      </section>

      <IonModal
        :is-open="!!selectedLogData"
        @ionModalDidDismiss="handleDismissModal"
      >
        <IonHeader :translucent="false">
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton @click="handleDismissModal">
                <IonIcon slot="icon-only" :icon="arrowDownOutline" />
              </IonButton>
            </IonButtons>
            <IonTitle v-if="selectedLogData">{{
              dayjs.unix(selectedLogData.ts / 1000).format(format)
            }}</IonTitle>

            <IonButtons slot="end">
              <IonButton @click="handleDeleteItem(selectedLogData?.id)">
                <IonIcon slot="icon-only" :icon="trashOutline" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent v-if="selectedLogData" class="ion-padding">
          <h4>
            {{ dayjs.unix(selectedLogData.ts / 1000).format(format) }}
          </h4>
          <h5>{{ selectedLogData.message }}</h5>

          <p class="text-xs h-full w-full overflow-y-auto ion-text-wrap">
            {{ selectedLogData?.data }}
          </p>
        </IonContent>
      </IonModal>
    </IonContent>
  </IonPage>
</template>
