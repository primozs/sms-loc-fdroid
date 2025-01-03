import { App } from '@capacitor/app';
import { onMounted, onUnmounted, ref } from 'vue';
import { useIonRouter } from '@ionic/vue';
import { Capacitor } from '@capacitor/core';
import { Core } from './plugins/core';
import { useQueryClient } from '@tanstack/vue-query';
// import { LogStore } from './services/logs';
import { getPresentationHasBeenViewed } from './views/presentation/usePresentation';
import {
  usePermissions,
  areAllPermisionsGranted,
} from '@/services/usePermissions';

export const useApp = () => {
  const ionRouter = useIonRouter();
  const queryClient = useQueryClient();

  const watchId = ref<string>();
  const { checkLocationAndPermissions } = usePermissions();

  onMounted(async () => {
    const presBeenViewed = await getPresentationHasBeenViewed();
    const allPermissionGranted = await areAllPermisionsGranted();

    if (presBeenViewed) {
      while (!allPermissionGranted) {
        const maybeCancel = await checkLocationAndPermissions();
        if (maybeCancel === 1) break;
      }
    }

    App.addListener('resume', async () => {
      const presBeenViewed = await getPresentationHasBeenViewed();

      if (presBeenViewed) {
        await checkLocationAndPermissions();
      }
    });

    App.addListener('backButton', async () => {
      if (!ionRouter.canGoBack()) {
        App.minimizeApp();
      }
    });

    if (Capacitor.getPlatform() === 'web') return;
    watchId.value = await Core.watchSmsReceiver({}, () => {
      // LogStore.getInstance().addLog({
      //   ts: new Date().getTime(),
      //   message: 'Client watchSmsReceiver action',
      //   data: action,
      // });

      queryClient.invalidateQueries({
        queryKey: [`/contacts`],
      });
      queryClient.refetchQueries({
        queryKey: [`/contacts`],
      });
    });
  });

  onUnmounted(async () => {
    await App.removeAllListeners();
  });
};
