import { onMounted, onUnmounted } from 'vue';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { logError } from './useLogger';

export const useNetworkEffect = (fn: (c: ConnectionStatus) => void) => {
  onMounted(async () => {
    Network.addListener('networkStatusChange', (status) => {
      fn(status);
    });

    Network.getStatus()
      .then((status) => {
        fn(status);
      })
      .catch(logError);
  });
  onUnmounted(() => {
    Network.removeAllListeners();
  });
};
