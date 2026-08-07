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
        <IonButtons slot="start" class="app-menu-btn-gap">
          <IonMenuButton />
        </IonButtons>
        <IonTitle>{{ $t('message.contacts') }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonHeader v-if="!locService.locServiceEnabled">
      <IonToolbar color="warning">
        <IonTitle class="app-warning-title">{{
          t('message.locationServicesCheckTitle')
        }}</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonHeader v-if="isError">
      <IonToolbar color="danger">
        <IonTitle class="app-warning-title">{{
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
        class="app-empty-center"
      >
        <IonNote class="ion-padding ion-text-center">{{
          $t('message.noContacts')
        }}</IonNote>
      </div>
      <AddContact />
      <SendSmsModal />
    </IonContent>
  </IonPage>
</template>
