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
import type { MapGeoJSONFeature } from 'maplibre-gl';
import { IonAccordionGroup } from '@ionic/vue';

const props = defineProps<{
  features: MapGeoJSONFeature[];
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
        :value="props.features[0].properties.id"
      >
      </IonAccordionGroup>
    </IonContent>
  </IonModal>
</template>
