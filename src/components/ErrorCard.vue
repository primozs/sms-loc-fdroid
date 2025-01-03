<script lang="ts" setup>
import {
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonCardSubtitle,
  IonCardTitle,
} from '@ionic/vue';

const props = defineProps<{
  title: string | undefined;
  content: string | undefined;
}>();
</script>

<template>
  <IonCard color="danger">
    <IonCardHeader :translucent="false">
      <IonCardTitle v-if="props.title">{{ props.title }}</IonCardTitle>
      <IonCardSubtitle>{{ $t('message.error') }}</IonCardSubtitle>
    </IonCardHeader>

    <IonCardContent v-if="props.content"> {{ props.content }} </IonCardContent>
    <slot></slot>
  </IonCard>
</template>
