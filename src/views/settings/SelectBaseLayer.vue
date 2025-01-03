<script lang="ts" setup>
import {
  IonRadioGroup,
  IonRadio,
  IonItem,
  IonListHeader,
  IonLabel,
  type RadioGroupCustomEvent,
} from '@ionic/vue';
import {
  type LayerType,
  MAP_BASE_LAYERS_LIST,
  useUseBaseLayers,
  type LayerTypeItem,
} from '@/map/baseLayers';
import { computed } from 'vue';

const store = useUseBaseLayers();

const handleUpdate = (e: RadioGroupCustomEvent<LayerTypeItem>) => {
  const selectedKey = e.detail.value as unknown as LayerType;
  const [selectedItem] = MAP_BASE_LAYERS_LIST.filter(
    (item) => item.key === selectedKey,
  );
  if (!selectedItem) return;

  store.setSelectedBaseLayer(selectedItem);
};

const selected = computed(() => {
  return store.selectedLayer;
});
</script>

<template>
  <IonListHeader class="text-lg leading-6 font-semibold">
    <IonLabel>{{ $t('message.baseLayers') }}</IonLabel>
  </IonListHeader>
  <IonRadioGroup :value="selected?.key" @ionChange="handleUpdate">
    <IonItem v-for="layer in MAP_BASE_LAYERS_LIST" :key="layer.key">
      <IonRadio
        :value="layer.key"
        :aria-label="layer.title"
        :checked="layer.key === store.selectedLayer?.key"
      >
        {{ layer.title }}
      </IonRadio>
    </IonItem>
  </IonRadioGroup>
</template>

<style>
:root[data-theme='light'] ion-radio {
  --border-color: rgba(0, 0, 0, 0.23);
}

:root[data-theme='dark'] ion-radio {
  --border-color: rgba(255, 255, 255, 0.23);
}

ion-radio::part(container) {
  width: 25px;
  height: 25px;

  border-radius: 100%;
  border: 1px solid var(--border-color);
}

ion-radio::part(mark) {
  background: none;
  transition: none;
  transform: none;
  translate: none;
  border-radius: 0;
}

ion-radio.radio-checked::part(container) {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}

ion-radio.radio-checked::part(mark) {
  border-width: 0px 1px 1px 0px;
  border-style: solid;
  border-color: #fff;

  transform: rotate(45deg);
  translate: 0px -3px;
  -webkit-transform-origin-x: 6px;
}
</style>
