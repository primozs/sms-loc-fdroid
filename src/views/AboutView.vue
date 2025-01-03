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
  queryKey: [`/docs/AboutView.md`],
  queryFn: async () => {
    try {
      const res = await fetch('/docs/AboutView.md');
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
        <IonTitle>{{ $t('message.about') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true" class="items-center">
      <AppLogoAndTitle />

      <div class="px-5 pt-0 pb-5 text-paragraphs" v-html="content"></div>
    </IonContent>
  </IonPage>
</template>

<style>
.text-paragraphs h1 {
  font-size: 22px;
}

.text-paragraphs h2 {
  font-size: 18px;
  margin-top: 1rem;
}

.text-paragraphs b {
  font-weight: 500;
}

.text-paragraphs p {
  font-size: 14px;
  line-height: 1.5;
  text-wrap: balance;
}
</style>
