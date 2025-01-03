<script lang="ts" setup>
import { IonItem, IonLabel, useIonRouter } from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { toStringDD } from '@/app/format';
import { computed } from 'vue';
import type { ResponseData } from '@/services/responses';
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/sl';
import { useTime } from '@/services/useTime';

const props = defineProps<{
  response: ResponseData;
}>();

dayjs.extend(duration);
dayjs.extend(relativeTime);

const ionRouter = useIonRouter();
const timeStore = useTime();
const { t, locale } = useI18n();

const timeFormated = computed(() => {
  return props.response
    ? dayjs.unix(props.response.ts / 1000).format(format.value)
    : '';
});

const format = computed(() => {
  return locale.value === 'sl' ? 'DD.MM.YY HH:mm' : 'YY/MM/DD/YY HH:mm';
});

const timeElapsed = computed(() => {
  return props.response
    ? dayjs
        .duration(timeStore.now - props.response.ts, 'milliseconds')
        .humanize()
    : '';
});

const elevation = computed(() => {
  return props.response ? Math.round(props.response.alt_m ?? 0) + ' m' : '';
});

const battery = computed(() =>
  props.response ? props.response.bat_p + ' %' : '',
);

const speed = computed(() =>
  props.response
    ? props.response?.v_kmh
      ? props.response?.v_kmh + ' km/h'
      : ''
    : '',
);

const locationFormated = computed(() => {
  return props.response
    ? toStringDD([props.response.lon, props.response.lat], 4)
    : '';
});

const message = computed(() => {
  return props.response?.message ?? '';
});

const handleClick = (response: ResponseData) => {
  const url = `/contacts/list/map/${response.id}`;
  ionRouter.navigate(url, 'forward', 'push');
};
</script>

<template>
  <IonItem @click="handleClick(response)">
    <IonLabel>
      <h3 class="font-medium">
        {{ t('message.time') }}: {{ timeFormated }} {{ t('message.elapsed') }}:
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
  </IonItem>
</template>
