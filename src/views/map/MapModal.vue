<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { IonAccordionGroup } from '@ionic/vue';

/** Minimal feature shape for the POI modal (avoids MapLibre MapGeoJSONFeature depth issues). */
export type MapModalFeature = {
  properties: Record<string, unknown> & { id?: string | number };
};

const props = defineProps<{
  features: MapModalFeature[];
}>();

const { t } = useI18n();

const emit = defineEmits(['close']);

const isOpen = computed(() => {
  if (!props.features) return false;
  return props.features.length > 0;
});

const handleDidDismiss = () => {
  emit('close');
};
</script>

<template>
  <IonModal
    handle-behavior="none"
    :is-open="isOpen"
    @didDismiss="handleDidDismiss"
    :initial-breakpoint="0.75"
    :breakpoints="[0, 0.2, 0.5, 0.75]"
    :backdrop-dismiss="false"
    :show-backdrop="false"
    :backdrop-breakpoint="1"
  >
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonTitle>{{ t('message.poi') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent>
      <IonAccordionGroup
        v-if="props.features.length > 0"
        :multiple="false"
        :value="String(props.features[0].properties.id ?? '')"
      >
      </IonAccordionGroup>
    </IonContent>
  </IonModal>
</template>
