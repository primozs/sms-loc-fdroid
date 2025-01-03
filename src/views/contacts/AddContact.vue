<script lang="ts" setup>
import { Contacts } from '@capacitor-community/contacts';
import { IonFab, IonFabButton, IonIcon, toastController } from '@ionic/vue';
import { add } from 'ionicons/icons';
import { useI18n } from 'vue-i18n';
import { logError } from '@/services/useLogger';
import { useDataStore } from '@/services/useDataStore';
import { useQueryClient } from '@tanstack/vue-query';

const { t } = useI18n();
const queryClient = useQueryClient();
const { contactsStore } = useDataStore();

const addContactHandler = async () => {
  try {
    Contacts.checkPermissions();
    const contact = await Contacts.pickContact({
      projection: {
        image: true,
        name: true,
        phones: true,
      },
    });
    await contactsStore.addContact(contact.contact);
    queryClient.invalidateQueries({
      queryKey: [`/contacts`],
    });
    queryClient.refetchQueries({
      queryKey: [`/contacts`],
    });
  } catch (error: any) {
    const errorMsg =
      error.message === 'CONTACT_NOT_VALID'
        ? t('message.CONTACT_NOT_VALID')
        : '';

    const toast = await toastController.create({
      message: `${t('message.error')}: ` + errorMsg,
      duration: 3000,
      position: 'top',
      color: 'danger',
    });
    await toast.present();
    logError(error);
  }
};
</script>

<template>
  <IonFab slot="fixed" horizontal="end" vertical="bottom">
    <IonFabButton @click="addContactHandler">
      <IonIcon :icon="add"></IonIcon>
    </IonFabButton>
  </IonFab>
</template>
