import { Network, type ConnectionStatus } from '@capacitor/network';
import { logError } from '@/services/useLogger';

export const watchNetwork = (fn: (c: ConnectionStatus) => void) => {
  Network.addListener('networkStatusChange', (status) => {
    fn(status);
  });

  Network.getStatus()
    .then((status) => {
      fn(status);
    })
    .catch(logError);

  return () => {
    Network.removeAllListeners();
  };
};
