<script lang="ts" setup>
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
} from '@ionic/vue';
import AppLogoAndTitle from '@/app/AppLogoAndTitle.vue';
import { marked } from 'marked';
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { logError } from '@/services/useLogger';

const { data } = useQuery({
  queryKey: [`/docs/SupportView.md`],
  queryFn: async () => {
    try {
      const res = await fetch('/docs/SupportView.md');
      const text = res.text();
      return text;
    } catch (error) {
      logError(error);
      return '';
    }
  },
  networkMode: 'always',
});

const content = computed(() => {
  if (!data?.value) return '';
  return marked(data.value);
});
</script>

<template>
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton></IonBackButton>
        </IonButtons>
        <IonTitle>{{ $t('message.support') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent class="items-center">
      <AppLogoAndTitle />

      <div class="ion-padding text-paragraphs" v-html="content"></div>
    </IonContent>
  </IonPage>
</template>
