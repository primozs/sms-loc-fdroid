import { inject } from 'vue';
import { sqliteServiceKey } from './sqliteService';
import { ContactStore } from './contacts';
import { ResponseStore } from './responses';
import { RequestStore } from './requests';

export const useDataStore = () => {
  const sqlite = inject(sqliteServiceKey);
  const contactsStore = ContactStore.getInstance(sqlite?.db);
  const responsesStore = ResponseStore.getInstance(sqlite?.db);
  const requestStore = RequestStore.getInstance(sqlite?.db);
  return { db: sqlite?.db, contactsStore, responsesStore, requestStore };
};
