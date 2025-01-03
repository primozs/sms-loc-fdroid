<script lang="ts" setup>
import { MAP_BASE_LAYERS, useUseBaseLayers } from '@/map/baseLayers';
import { IonItem, IonLabel, IonIcon, IonToggle } from '@ionic/vue';
import { moon, sunny } from 'ionicons/icons';
import { Ref, inject } from 'vue';

const theme = inject<{ theme: Ref<string>; toggleTheme: () => void }>('theme');
const layersSetting = useUseBaseLayers();

const handleToggle = () => {
  if (theme?.theme.value === 'light') {
    layersSetting.setSelectedBaseLayer(MAP_BASE_LAYERS.STENAR_BLUE);
  } else {
    layersSetting.setSelectedBaseLayer(MAP_BASE_LAYERS.STENAR_LIGHT);
  }

  theme?.toggleTheme();
};
</script>

<template>
  <IonItem lines="full">
    <IonIcon
      slot="start"
      :icon="theme?.theme.value === 'dark' ? sunny : moon"
    ></IonIcon>
    <IonLabel>{{ $t('message.darkMode') }}</IonLabel>
    <div slot="end">
      <IonToggle
        :aria-label="$t('message.darkMode')"
        :checked="theme?.theme.value === 'dark'"
        @ionChange="() => handleToggle()"
        class="py-3"
      >
      </IonToggle>
    </div>
  </IonItem>
</template>
