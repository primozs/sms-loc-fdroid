import { formatLength, toStringDD } from '@/app/format';
import { type ResponseData } from '@/services/responses';
import { type RequestData } from '@/services/requests';
import { useLocation } from '@/services/useLocation';
import { useTime } from '@/services/useTime';
import { LineString } from 'ol/geom';
import type { ContactDisplay } from '@/services/useContactsData';
import { fromLonLat } from 'ol/proj';
import { Ref, computed, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import * as dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import 'dayjs/locale/sl';

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const useItemData = (
  contact: Ref<ContactDisplay | undefined | null>,
) => {
  const { locale } = useI18n();
  const timeStore = useTime();
  const locStore = useLocation();

  const response = computed(() => {
    const responses = contact.value?.responses ?? [];
    // should not be last response but first received response for this person
    // sent responses are responses sent to the person
    const firstReceivedResponse = responses.find(
      (item) => item.type === 'received',
    );
    return firstReceivedResponse as ResponseData | undefined;
  });

  const request = computed(() => {
    const requests = (contact.value?.requests ?? []).filter(
      (item) => item.type === 'sent',
    );
    return requests[0] as RequestData | undefined;
  });

  watchEffect(() => {
    dayjs.locale(locale.value);
  });

  const status = computed(() => {
    const requestValid = timeStore.now - 15 * 60 * 1000;
    const oneHourBack = timeStore.now - 60 * 60 * 1000;

    if (response.value === undefined) return 'none';

    if (response.value && response.value.ts >= requestValid) {
      return 'green';
    }
    if (request.value && request.value.ts >= requestValid) {
      return 'orange';
    }

    if (response.value && response.value.ts >= oneHourBack) return 'green';

    return 'gray';
  });

  const olderThen4Hours = computed(() => {
    const fourHoursBack = timeStore.now - 4 * 60 * 60 * 1000;
    if (response.value && response.value.ts <= fourHoursBack) return true;
    return false;
  });

  const distance = computed(() => {
    if (!response.value) return null;
    if (!locStore.lastLocation) return null;

    const myPos = [
      locStore.lastLocation.coords.longitude,
      locStore.lastLocation.coords.latitude,
    ];

    const line = new LineString([
      fromLonLat(myPos),
      fromLonLat([response.value.lon, response.value.lat]),
    ]);
    const dist = formatLength(line);
    return dist;
  });

  const format = computed(() => {
    return locale.value === 'sl' ? 'DD.MM.YY HH:mm' : 'YY/MM/DD/YY HH:mm';
  });

  const timeFormated = computed(() => {
    return response.value
      ? dayjs.unix(response.value.ts / 1000).format(format.value)
      : '';
  });

  const timeElapsed = computed(() => {
    return response.value && dayjs.duration
      ? dayjs
          .duration(timeStore.now - response.value.ts, 'milliseconds')
          .humanize()
      : '';
  });

  const locationFormated = computed(() => {
    return response.value
      ? toStringDD([response.value.lon, response.value.lat], 4)
      : '';
  });

  const elevation = computed(() => {
    return response.value ? Math.round(response.value.alt_m ?? 0) + ' m' : '';
  });

  const battery = computed(() =>
    response.value ? response.value.bat_p + ' %' : '',
  );

  const speed = computed(() =>
    request.value
      ? response.value?.v_kmh
        ? response.value?.v_kmh + ' km/h'
        : ''
      : '',
  );

  const message = computed(() => {
    return response.value?.message ?? '';
  });

  return {
    response,
    distance,
    timeFormated,
    timeElapsed,
    locationFormated,
    elevation,
    battery,
    status,
    speed,
    olderThen4Hours,
    message,
  };
};
