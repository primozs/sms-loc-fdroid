<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonGrid,
  IonRow,
  IonCol,
  type RefresherCustomEvent,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useContactData } from '@/services/useContactsData';
import SpinnerDisplay from '@/components/SpinnerDisplay.vue';
import ContactDetailInfo from './ContactDetailInfo.vue';
import ContactDetailLastResponse from './ContactDetailLastResponse.vue';
import HistoryListItem from './HistoryListItem.vue';
import { useVirtualList } from '@vueuse/core';
import { useQueryClient } from '@tanstack/vue-query';
import UiContent from '@/components/UiContent.vue';
// import ResponseListItem from './ResponseListItem.vue';
// import RequestListItem from './RequestListItem.vue';

const route = useRoute();

const { t } = useI18n();
const segment = ref<'history' | 'locations' | 'requests' | 'statistics'>(
  'history',
);

const {
  isError,
  isLoading,
  data: contact,
} = useContactData(Number(route.params.id));

type StatsObject = {
  noRequestSent: number;
  noRequestReceived: number;
  noResponsesReceived: number;
  noResponsesSent: number;
};

const stats = computed(() => {
  if (!contact.value)
    return {
      noRequestSent: 0,
      noRequestReceived: 0,
      noResponsesReceived: 0,
      noResponsesSent: 0,
    };

  const result = contact.value.history.reduce(
    (prev: StatsObject, curr) => {
      const newVal: StatsObject = {
        ...prev,
      };

      if (curr.response) {
        if (curr.response.type === 'sent') {
          newVal.noResponsesSent += 1;
        } else {
          newVal.noResponsesReceived += 1;
        }
        return newVal;
      }

      if (curr.request) {
        if (curr.request.type === 'sent') {
          newVal.noRequestSent += 1;
        } else {
          newVal.noRequestReceived += 1;
        }
        return newVal;
      }

      return newVal;
    },
    {
      noRequestSent: 0,
      noRequestReceived: 0,
      noResponsesReceived: 0,
      noResponsesSent: 0,
    },
  );
  return result;
});

const history = computed(() => {
  return contact.value?.history ?? [];
});

const {
  list: historyList,
  containerProps,
  wrapperProps,
} = useVirtualList(history, {
  itemHeight: 128,
  overscan: 10,
});

const queryClient = useQueryClient();

const handleRefresh = (event: RefresherCustomEvent) => {
  queryClient.invalidateQueries({
    queryKey: [`/contact/${Number(route.params.id)}`, Number(route.params.id)],
  });
  queryClient
    .refetchQueries({
      queryKey: [
        `/contact/${Number(route.params.id)}`,
        Number(route.params.id),
      ],
    })
    .then(() => {
      event.target.complete();
    });
};
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton />
        </IonButtons>
        <IonTitle>{{ t('message.contact') }}</IonTitle>
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
      <IonRefresher
        slot="fixed"
        @ionRefresh="handleRefresh($event)"
        class="z-10 bg-white dark:bg-black"
      >
        <IonRefresherContent></IonRefresherContent>
      </IonRefresher>

      <UiContent>
        <template #start>
          <SpinnerDisplay :isLoading="isLoading"></SpinnerDisplay>
          <ContactDetailInfo :contact="contact" />
          <ContactDetailLastResponse :contact="contact" />
          <section>
            <div class="px-3.5 mt-2">
              <IonSegment v-model="segment">
                <IonSegmentButton value="history">
                  <IonLabel>{{ t('message.history') }}</IonLabel>
                </IonSegmentButton>

                <IonSegmentButton value="statistics">
                  <IonLabel>{{ t('message.statistics') }}</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </div>
          </section>
        </template>

        <div
          v-if="segment === 'history'"
          v-bind="containerProps"
          class="h-full ion-content-scroll-host"
        >
          <div v-bind="wrapperProps">
            <HistoryListItem
              v-for="item in historyList"
              :key="item.index"
              :historyItem="item.data"
            />
          </div>
        </div>

        <!-- <IonList
          v-if="
            AB &&
            segment === 'locations' &&
            contact &&
            (contact?.responses ?? []).length > 0
          "
          class="mb-3 mt-2.5"
        >
          <ResponseListItem
            v-for="response in contact.responses"
            :response="response"
            :key="response.id"
          />
        </IonList>

        <IonList
          v-if="
            AB &&
            segment === 'requests' &&
            contact &&
            (contact?.requests ?? []).length > 0
          "
          class="mb-3 mt-2.5"
        >
          <RequestListItem
            v-for="request in contact.requests"
            :request="request"
            :key="request.id"
          />
        </IonList> -->

        <IonGrid
          v-if="segment === 'statistics'"
          class="p-3 ion-content-scroll-host"
        >
          <IonRow>
            <IonCol>
              <span class="font-medium">{{ t('message.statRequestSent') }}</span
              >: {{ stats.noRequestSent }}
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol>
              <span class="font-medium">{{
                t('message.statRequestReceived')
              }}</span
              >: {{ stats.noRequestReceived }}
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol>
              <span class="font-medium">{{
                t('message.statResponsesSent')
              }}</span
              >: {{ stats.noResponsesSent }}
            </IonCol>
          </IonRow>
          <IonRow>
            <IonCol>
              <span class="font-medium">{{
                t('message.statResponsesReceived')
              }}</span
              >: {{ stats.noResponsesReceived }}
            </IonCol>
          </IonRow>
        </IonGrid>
      </UiContent>
    </IonContent>
  </IonPage>
</template>
