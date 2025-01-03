import { useQuery } from '@tanstack/vue-query';
import { useDataStore } from './useDataStore';
import { LogStore } from './logs';

export const useLogsData = () => {
  const { db } = useDataStore();
  const { isLoading, isFetching, isError, data } = useQuery({
    queryKey: ['/logs'],
    queryFn: async () => {
      const ls = LogStore.getInstance(db);
      const logs = await ls.getLogs();
      return logs ?? [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    initialData: [],
    networkMode: 'always',
  });

  return {
    isLoading,
    isFetching,
    isError,
    data,
  };
};
