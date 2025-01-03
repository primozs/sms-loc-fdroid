<script lang="ts" setup>
import type { HistoryItem } from '@/services/useContactsData';
import { IonItem, IonLabel, useIonRouter } from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/sl';
import { useTime } from '@/services/useTime';
import type { ResponseData } from '@/services/responses';
import { toStringDD } from '@/app/format';

const props = defineProps<{
  historyItem: HistoryItem;
}>();

dayjs.extend(duration);
dayjs.extend(relativeTime);

const ionRouter = useIonRouter();
const timeStore = useTime();
const { t, locale } = useI18n();

const request = computed(() => {
  return props.historyItem.request;
});

const response = computed(() => {
  return props.historyItem.response;
});

const timeFormated = computed(() => {
  return props.historyItem.ts
    ? dayjs.unix(props.historyItem.ts / 1000).format(format.value)
    : '';
});

const format = computed(() => {
  return locale.value === 'sl' ? 'DD.MM.YY HH:mm' : 'YY/MM/DD/YY HH:mm';
});

const timeElapsed = computed(() => {
  return props.historyItem.ts
    ? dayjs
        .duration(timeStore.now - props.historyItem.ts, 'milliseconds')
        .humanize()
    : '';
});

const elevation = computed(() => {
  return response.value ? Math.round(response.value.alt_m ?? 0) + ' m' : '';
});

const battery = computed(() =>
  response.value ? response.value.bat_p + ' %' : '',
);

const speed = computed(() =>
  response.value
    ? response.value?.v_kmh
      ? response.value?.v_kmh + ' km/h'
      : ''
    : '',
);

const locationFormated = computed(() => {
  return response.value
    ? toStringDD([response.value.lon, response.value.lat], 4)
    : '';
});

const message = computed(() => {
  return response.value?.message ?? '';
});

const handleClick = (response: ResponseData) => {
  const url = `/contacts/list/map/${response.id}`;
  ionRouter.navigate(url, 'forward', 'push');
};
</script>

<template>
  <IonItem lines="none" class="h-32 select-none border-transparent">
    <div
      v-if="request"
      :class="['flex w-full', { 'justify-end': request?.type === 'sent' }]"
    >
      <div
        :class="[
          'bg-slate-100 dark:bg-gray-600 rounded-2xl p-4 my-2',
          {
            'rounded-tr-none': request?.type === 'sent',
            'rounded-tl-none': request?.type === 'received',
          },
        ]"
      >
        <IonLabel>
          <h3 class="font-medium">
            {{
              request?.type === 'sent'
                ? t('message.requestSent')
                : t('message.requestReceived')
            }}
          </h3>

          <p class="flex gap-4">
            <span>
              <span class="font-medium"> {{ t('message.time') }} </span>:
              {{ timeFormated }}
            </span>
            <span>
              <span class="font-medium">{{ t('message.elapsed') }}</span
              >: {{ timeElapsed }}
            </span>
          </p>
        </IonLabel>
      </div>
    </div>

    <div
      v-if="response"
      @click="handleClick(response)"
      :class="[
        'flex w-full',
        {
          'justify-end': response?.type === 'sent',
        },
      ]"
    >
      <div
        v-if="response"
        :class="[
          'bg-slate-100 dark:bg-gray-600 rounded-2xl p-4 my-2',
          {
            'rounded-tr-none': response?.type === 'sent',
            'rounded-tl-none': response?.type === 'received',
          },
        ]"
      >
        <IonLabel>
          <h3 class="font-medium">
            {{ t('message.time') }}: {{ timeFormated }}
            {{ t('message.elapsed') }}:
            {{ timeElapsed }}
          </h3>

          <h3 v-if="message" class="text-sm">
            {{ t(`message.${message}`) }}
          </h3>

          <p class="flex gap-4">
            <span v-if="elevation">
              <span class="font-medium"> {{ t('message.elevation') }} </span>:
              {{ elevation }}
            </span>
            <span v-if="speed">
              <span class="font-medium">{{ t('message.speed') }}</span
              >: {{ speed }}
            </span>
            <span v-if="battery">
              <span class="font-medium">{{ t('message.battery') }}</span
              >: {{ battery }}
            </span>
          </p>
          <p>
            <span class="font-medium">{{ t('message.location') }}</span
            >: {{ locationFormated }}
          </p>
        </IonLabel>
      </div>
    </div>
  </IonItem>
</template>
