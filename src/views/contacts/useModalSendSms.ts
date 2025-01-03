import type { ContactData } from '@/services/contacts';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useModalSendSms = defineStore('useModalSendSms', () => {
  const contact = ref<ContactData | null>();
  const setContactModel = (item: ContactData | null) => {
    contact.value = item;
  };

  return { contact, setContactModel };
});
