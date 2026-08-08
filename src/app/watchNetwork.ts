import { Network, type ConnectionStatus } from '@capacitor/network';
import { logError } from '@/services/useLogger';

export const watchNetwork = (fn: (c: ConnectionStatus) => void) => {
  const sub = Network.addListener('networkStatusChange', (status) => {
    fn(status);
  });

  Network.getStatus()
    .then((status) => {
      fn(status);
    })
    .catch(logError);

  return () => {
    void sub.then((handle) => handle.remove());
  };
};
