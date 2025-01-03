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
  queryKey: [`/docs/TermsOfUseView.md`],
  queryFn: async () => {
    try {
      const res = await fetch('/docs/TermsOfUseView.md');
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
        <IonTitle>{{ $t('message.privacyPolicy') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent class="items-center">
      <AppLogoAndTitle />

      <div
        class="ion-padding text-paragraphs leading-5 paragraphs"
        v-html="content"
      ></div>
    </IonContent>
  </IonPage>
</template>
