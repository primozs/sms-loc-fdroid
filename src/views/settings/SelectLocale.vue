<script lang="ts" setup>
import { IonItem, IonIcon, IonSelect, IonSelectOption } from '@ionic/vue';
import { languageOutline } from 'ionicons/icons';
import { useI18n } from 'vue-i18n';
import { Preferences } from '@capacitor/preferences';
import { Locale } from '@/plugins/locale';

const { locale } = useI18n();

const handleLanguageChange = async (ev: any) => {
  locale.value = ev.detail.value;
  await Preferences.set({ key: 'locale', value: locale.value });
  await Locale.setLocale({ value: locale.value });
};
</script>

<template>
  <IonItem>
    <IonIcon slot="start" :icon="languageOutline"></IonIcon>
    <IonSelect
      :label="$t('message.language')"
      label-placement="stacked"
      :value="locale"
      @ionChange="handleLanguageChange"
    >
      <IonSelectOption value="en">English</IonSelectOption>
      <IonSelectOption value="sl">Slovenščina</IonSelectOption>
    </IonSelect>
  </IonItem>
</template>
