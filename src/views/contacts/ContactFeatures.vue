<script lang="ts" setup>
import { inject, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ErrorCard from '@/components/ErrorCard.vue';
import SpinnerDisplay from '@/components/SpinnerDisplay.vue';
import { useContactsData } from '@/services/useContactsData';
import { ContactsLayer } from './contactsLayer';
import { maplibreMapkey, type MapLibreAwaitedRef } from '@/map/mapKeys';
import { MapPopupSet } from '@/map/MapPopupSet';
import { useLocation } from '@/services/useLocation';
import type { ContactDisplay } from '@/services/useContactsData';
import { newestReceivedTs } from '@/map/initialCamera';

const props = defineProps<{
  /** True when MapLibre was constructed with that camera already. */
  skipInitialFit?: boolean;
  /** Bump to recenter on newest Loc: / my GPS without remounting. */
  focusKey?: number;
}>();

const mlMap = inject(maplibreMapkey) as MapLibreAwaitedRef;
const { t } = useI18n();
const { isLoading, isError, data } = useContactsData();
const locStore = useLocation();

let contactsLayer: ContactsLayer | undefined;
let popups: MapPopupSet | undefined;
let didFit = false;
let lastFocusedTs = -Infinity;

const focusMap = () => {
  if (!contactsLayer) return;
  if (contactsLayer.fitToSource()) return;
  if (locStore.lastLocation) {
    contactsLayer.fitToLoc(locStore.lastLocation);
  }
};

const syncContacts = (contacts: ContactDisplay[] | undefined) => {
  if (!contactsLayer || !popups) return;

  const { overlays, hasFeatures } = contactsLayer.update(contacts ?? []);

  popups.setItems(
    overlays.flatMap((item) => {
      const text = t(`message.${item.message}`).trim();
      // Skip missing i18n keys (vue-i18n returns the key path)
      if (!text || text === `message.${item.message}`) return [];
      return [{ lngLat: item.coordinates, text }];
    }),
  );

  const newestTs = newestReceivedTs(contacts);

  if (!didFit) {
    didFit = true;
    if (newestTs !== undefined) lastFocusedTs = newestTs;
    if (props.skipInitialFit) return;
    if (hasFeatures) {
      contactsLayer.fitToSource();
    } else if (locStore.lastLocation) {
      contactsLayer.fitToLoc(locStore.lastLocation);
    }
    return;
  }

  if (newestTs !== undefined && newestTs > lastFocusedTs) {
    lastFocusedTs = newestTs;
    focusMap();
  }
};

onMounted(() => {
  const map = mlMap.value;
  contactsLayer = new ContactsLayer(map);
  popups = new MapPopupSet(map);
  syncContacts(data.value);
});

watch(data, (contacts) => syncContacts(contacts));

watch(
  () => props.focusKey,
  (key, prev) => {
    if (key === undefined || key === prev) return;
    const newestTs = newestReceivedTs(data.value);
    if (newestTs !== undefined) lastFocusedTs = newestTs;
    focusMap();
  },
);

onUnmounted(() => {
  popups?.clear();
  popups = undefined;
  contactsLayer?.destroy();
  contactsLayer = undefined;
});
</script>

<template>
  <div v-if="isError" class="app-overlay app-overlay--inset">
    <ErrorCard
      title=""
      :content="$t('message.errorFetchingData')"
    ></ErrorCard>
  </div>
  <div v-if="isLoading" class="app-overlay app-overlay--full">
    <SpinnerDisplay :isLoading="isLoading"></SpinnerDisplay>
  </div>
</template>
