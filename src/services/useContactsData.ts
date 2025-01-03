import { useQuery } from '@tanstack/vue-query';
import { useDataStore } from '@/services/useDataStore';
import type { ContactData } from './contacts';
import type { ResponseData } from './responses';
import type { RequestData } from './requests';
import { useLocation } from './useLocation';
import { computed } from 'vue';
import { logDebug } from './useLogger';

export type ContactDisplay = {
  responses: ResponseData[];
  requests: RequestData[];
} & ContactData;

export const useContactsData = () => {
  const { getLocation } = useLocation();
  const { contactsStore, responsesStore, requestStore } = useDataStore();
  const { isLoading, isFetching, isError, data } = useQuery({
    queryKey: ['/contacts'],
    queryFn: async () => {
      getLocation();
      const contacts = await contactsStore.getContacts();
      const responses = await responsesStore.getResponses('day');
      const requests = await requestStore.getRequests('day');

      const dContacts: ContactDisplay[] = [];
      for (const contact of contacts) {
        const contactResponses = responses.filter(
          (response) => response.contactId === contact.contactId,
        );
        const contactRequests = requests.filter(
          (request) => request.contactId === contact.contactId,
        );

        const contactDisplay = {
          ...contact,
          responses: contactResponses,
          requests: contactRequests,
        };
        dContacts.push(contactDisplay);
      }

      return dContacts;
    },
    networkMode: 'always',
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    initialData: [],
  });

  return {
    isLoading,
    isFetching,
    isError,
    data,
  };
};

export type HistoryItem = {
  ts: number;
  request: RequestData | null;
  response: ResponseData | null;
};

export const useContactData = (id: number) => {
  const queryEnabled = computed(() => !!id);
  const { getLocation } = useLocation();
  const { contactsStore, responsesStore, requestStore } = useDataStore();
  const { isLoading, isFetching, isError, data } = useQuery({
    queryKey: [`/contact/${id}`, id],
    queryFn: async () => {
      getLocation();
      const contact = await contactsStore.getContactById(id);
      if (!contact) {
        logDebug('useContactsData useContactData', 'no contact');
        return null;
      }
      const responses = await responsesStore.getResponsesByUser(
        contact.contactId,
      );
      const requests = await requestStore.getRequestsByUser(contact.contactId);

      const history: HistoryItem[] = [];
      responses.forEach((item) => {
        history.push({
          ts: item.ts,
          request: null,
          response: item,
        });
      });
      requests.forEach((item) => {
        history.push({
          ts: item.ts,
          request: item,
          response: null,
        });
      });

      const contactDisplay: ContactDisplay & { history: HistoryItem[] } = {
        ...contact,
        responses,
        requests,
        history: history.sort((a, b) => b.ts - a.ts),
      };

      return contactDisplay;
    },
    networkMode: 'always',
    enabled: queryEnabled,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    initialData: null,
  });

  return {
    isLoading,
    isFetching,
    isError,
    data,
  };
};
