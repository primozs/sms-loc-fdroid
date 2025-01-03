<script lang="ts" setup>
import {
  IonContent,
  IonHeader,
  IonPage,
  IonToolbar,
  IonMenuButton,
  IonNote,
  IonTitle,
  IonButtons,
  IonList,
} from '@ionic/vue';
import SpinnerDisplay from '@/components/SpinnerDisplay.vue';
import AddContact from './AddContact.vue';
import { useContactsData } from '@/services/useContactsData';
import ContactListItem from '@/views/contacts/ContactListItem.vue';
import { useI18n } from 'vue-i18n';
import { useLocationService } from '@/services/useLocation';
import SendSmsModal from './SendSmsModal.vue';
import { usePrefetch } from './usePrefetch';

const { t } = useI18n();
const { isLoading, isError, data } = useContactsData();
const locService = useLocationService();

usePrefetch({
  path: '/contacts/map',
});
</script>

<template>
  <IonPage>
    <IonHeader :translucent="false">
      <IonToolbar>
        <IonButtons slot="start" class="mr-2">
          <IonMenuButton />
        </IonButtons>
        <IonTitle>{{ $t('message.contacts') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonHeader v-if="!locService.locServiceEnabled">
      <IonToolbar color="warning">
        <IonTitle class="text-gray-900">{{
          t('message.locationServicesCheckTitle')
        }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonHeader v-if="isError">
      <IonToolbar color="danger">
        <IonTitle class="text-gray-900">{{
          t('message.errorFetchingData')
        }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent :fullscreen="true">
      <SpinnerDisplay :isLoading="isLoading"></SpinnerDisplay>

      <IonList v-if="data.length > 0">
        <ContactListItem
          v-for="contact in data"
          :key="contact.id"
          :contact="contact"
        />
      </IonList>
      <div
        v-if="data.length === 0"
        class="flex h-full justify-center items-center"
      >
        <IonNote class="ion-padding text-center select-none">{{
          $t('message.noContacts')
        }}</IonNote>
      </div>
      <AddContact />
      <SendSmsModal />
    </IonContent>
  </IonPage>
</template>
