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
  <IonItem lines="none" class="history-item">
    <div
      v-if="request"
      class="bubble-row"
      :class="{ 'bubble-row--end': request?.type === 'sent' }"
    >
      <div
        class="bubble"
        :class="{
          'bubble--sent': request?.type === 'sent',
          'bubble--received': request?.type === 'received',
        }"
      >
        <IonLabel>
          <h3 class="meta-label">
            {{
              request?.type === 'sent'
                ? t('message.requestSent')
                : t('message.requestReceived')
            }}
          </h3>

          <p class="meta-row">
            <span>
              <span class="meta-label"> {{ t('message.time') }} </span>:
              {{ timeFormated }}
            </span>
            <span>
              <span class="meta-label">{{ t('message.elapsed') }}</span
              >: {{ timeElapsed }}
            </span>
          </p>
        </IonLabel>
      </div>
    </div>

    <div
      v-if="response"
      @click="handleClick(response)"
      class="bubble-row"
      :class="{ 'bubble-row--end': response?.type === 'sent' }"
    >
      <div
        v-if="response"
        class="bubble"
        :class="{
          'bubble--sent': response?.type === 'sent',
          'bubble--received': response?.type === 'received',
        }"
      >
        <IonLabel>
          <h3 class="meta-label">
            {{ t('message.time') }}: {{ timeFormated }}
            {{ t('message.elapsed') }}:
            {{ timeElapsed }}
          </h3>

          <h3 v-if="message" class="msg-sm">
            {{ t(`message.${message}`) }}
          </h3>

          <p class="meta-row">
            <span v-if="elevation">
              <span class="meta-label"> {{ t('message.elevation') }} </span>:
              {{ elevation }}
            </span>
            <span v-if="speed">
              <span class="meta-label">{{ t('message.speed') }}</span
              >: {{ speed }}
            </span>
            <span v-if="battery">
              <span class="meta-label">{{ t('message.battery') }}</span
              >: {{ battery }}
            </span>
          </p>
          <p>
            <span class="meta-label">{{ t('message.location') }}</span
            >: {{ locationFormated }}
          </p>
        </IonLabel>
      </div>
    </div>
  </IonItem>
</template>

<style scoped>
.history-item {
  height: 8rem;
  user-select: none;
  --border-color: transparent;
}
.bubble-row {
  display: flex;
  width: 100%;
}
.bubble-row--end {
  justify-content: flex-end;
}
.bubble {
  background: var(--ion-color-step-100, #f1f5f9);
  border-radius: 1rem;
  padding: 1rem;
  margin: 0.5rem 0;
}
.bubble--sent {
  border-top-right-radius: 0;
}
.bubble--received {
  border-top-left-radius: 0;
}
.meta-label {
  font-weight: 500;
}
.meta-row {
  display: flex;
  gap: 1rem;
}
.msg-sm {
  font-size: 0.875rem;
}
</style>
