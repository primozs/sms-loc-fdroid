<script lang="ts" setup>
import { IonNote, IonText } from '@ionic/vue';

const props = withDefaults(defineProps<{ showIcon?: boolean }>(), {
  showIcon: true,
});
</script>

<template>
  <div class="flex">
    <div class="flex flex-col">
      <IonNote class="text-sm truncate">
        <slot name="title"></slot>
      </IonNote>
      <div class="flex gap-1 items-center">
        <div v-if="props.showIcon" class="flex justify-center items-center">
          <slot name="icon"></slot>
        </div>
        <IonText class="text-xl font-semibold">
          <slot name="value"></slot>{{ ' ' }}
          <span class="text-xs">
            <slot name="unit"></slot>
          </span>
        </IonText>
      </div>
    </div>
  </div>
</template>
