<script lang="ts" setup>
import { IonItem, IonLabel, IonIcon } from '@ionic/vue';
import {
  arrowForwardCircleOutline,
  arrowBackCircleOutline,
} from 'ionicons/icons';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/sl';
import { useTime } from '@/services/useTime';
import type { RequestData } from '@/services/requests';

const props = defineProps<{
  request: RequestData;
}>();

dayjs.extend(duration);
dayjs.extend(relativeTime);

const timeStore = useTime();
const { t, locale } = useI18n();

const timeFormated = computed(() => {
  return props.request
    ? dayjs.unix(props.request.ts / 1000).format(format.value)
    : '';
});

const format = computed(() => {
  return locale.value === 'sl' ? 'DD.MM.YY HH:mm' : 'YY/MM/DD/YY HH:mm';
});

const timeElapsed = computed(() => {
  return props.request
    ? dayjs
        .duration(timeStore.now - props.request.ts, 'milliseconds')
        .humanize()
    : '';
});
</script>

<template>
  <IonItem>
    <IonIcon
      :color="request.type === 'sent' ? 'primary' : 'secondary'"
      :icon="
        request.type === 'sent'
          ? arrowForwardCircleOutline
          : arrowBackCircleOutline
      "
      slot="start"
    />
    <IonLabel>
      <h3 class="font-medium">
        {{
          request.type === 'sent'
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
  </IonItem>
</template>
