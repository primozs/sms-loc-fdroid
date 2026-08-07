<script lang="ts" setup>
import { IonNote, IonText } from '@ionic/vue';

const props = withDefaults(defineProps<{ showIcon?: boolean }>(), {
  showIcon: true,
});
</script>

<template>
  <div class="ui-box">
    <div class="ui-box__col">
      <IonNote class="ui-box__title">
        <slot name="title"></slot>
      </IonNote>
      <div class="ui-box__value-row">
        <div v-if="props.showIcon" class="ui-box__icon">
          <slot name="icon"></slot>
        </div>
        <IonText class="ui-box__value">
          <slot name="value"></slot>{{ ' ' }}
          <span class="ui-box__unit">
            <slot name="unit"></slot>
          </span>
        </IonText>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-box {
  display: flex;
}
.ui-box__col {
  display: flex;
  flex-direction: column;
}
.ui-box__title {
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ui-box__value-row {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}
.ui-box__icon {
  display: flex;
  justify-content: center;
  align-items: center;
}
.ui-box__value {
  font-size: 1.25rem;
  font-weight: 600;
}
.ui-box__unit {
  font-size: 0.75rem;
}
</style>
