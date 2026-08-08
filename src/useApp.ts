import { App } from '@capacitor/app';
import { onMounted, onUnmounted, ref } from 'vue';
import { useIonRouter } from '@ionic/vue';
import { Capacitor } from '@capacitor/core';
import { Core } from './plugins/core';
import { useQueryClient } from '@tanstack/vue-query';
import { getPresentationHasBeenViewed } from './views/presentation/usePresentation';
import {
  usePermissions,
  areAllPermisionsGranted,
} from '@/services/usePermissions';
import { runPermissionSetupLoop } from '@/services/permissionSetupLoop';
import { bootstrapOfflineMaps } from '@/plugins/offlineMapServer';

export const useApp = () => {
  const ionRouter = useIonRouter();
  const queryClient = useQueryClient();

  const watchId = ref<string>();
  const { checkLocationAndPermissions } = usePermissions();

  onMounted(async () => {
    const presBeenViewed = await getPresentationHasBeenViewed();

    if (presBeenViewed) {
      // must re-await areAllPermisionsGranted each iteration — a stale flag loops forever
      await runPermissionSetupLoop(
        areAllPermisionsGranted,
        checkLocationAndPermissions,
      );
    }

    App.addListener('resume', async () => {
      const viewed = await getPresentationHasBeenViewed();
      if (viewed) {
        await checkLocationAndPermissions();
      }
      // Pack may appear after Settings install while backgrounded.
      void bootstrapOfflineMaps();
    });

    App.addListener('backButton', async () => {
      if (!ionRouter.canGoBack()) {
        App.minimizeApp();
      }
    });

    if (Capacitor.getPlatform() === 'web') return;

    void bootstrapOfflineMaps();

    watchId.value = await Core.watchSmsReceiver({}, () => {
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
