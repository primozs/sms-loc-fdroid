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

const mlMap = inject(maplibreMapkey) as MapLibreAwaitedRef;
const { t } = useI18n();
const { isLoading, isError, data } = useContactsData();
const locStore = useLocation();

let contactsLayer: ContactsLayer | undefined;
let popups: MapPopupSet | undefined;
let didFit = false;

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

  if (!didFit) {
    didFit = true;
    requestAnimationFrame(() => {
      if (hasFeatures) {
        contactsLayer?.fitToSource();
      } else if (locStore.lastLocation) {
        contactsLayer?.fitToLoc(locStore.lastLocation);
      }
    });
  }
};

onMounted(() => {
  const map = mlMap.value;
  contactsLayer = new ContactsLayer(map);
  popups = new MapPopupSet(map);
  syncContacts(data.value);
});

watch(data, (contacts) => syncContacts(contacts));

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
