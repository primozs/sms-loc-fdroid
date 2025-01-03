<script lang="ts" setup>
import { IonItem, IonIcon, IonLabel } from '@ionic/vue';
import { radioButtonOnOutline } from 'ionicons/icons';
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { config } from '@/config';
import { logError } from '@/services/useLogger';
import { useTime } from '@/services/useTime';
import { NodeJS } from 'capacitor-nodejs';
import { Capacitor } from '@capacitor/core';

const timeStore = useTime();

const { isError, data } = useQuery({
  queryKey: ['/server-status'],
  queryFn: async () => {
    try {
      if (!Capacitor.isNativePlatform()) return null;

      await NodeJS.whenReady();
      const port = config.SERVER_PORT;
      const mapsDownloadUrl = config.OFFLINE_MAP_DOWNLOAD_URL;
      const serverUrl = `http://localhost:${port}/healthy`;
      const res = await fetch(serverUrl);
      const status = (await res.json()) as { ts: number; now: string };

      return {
        port,
        mapsDownloadUrl,
        serverUrl,
        status,
      };
    } catch (error) {
      logError(error);
      throw new Error('Server status');
    }
  },
  networkMode: 'always',
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchInterval: 60000,
});

const color = computed(() => {
  if (isError.value) return 'danger';

  const status = data.value?.status;
  if (!status) return 'danger';

  const ago = timeStore.now - 60 * 1000;
  if (status.ts < ago) {
    return 'danger';
  } else {
    return 'success';
  }
});
</script>

<template>
  <IonItem lines="full">
    <IonIcon slot="start" :icon="radioButtonOnOutline" :color="color"></IonIcon>
    <IonLabel>
      Server healthy

      <p>{{ data?.status.now }}</p>
      <p>{{ data?.serverUrl }}</p>
      <p>{{ data?.mapsDownloadUrl }}</p>
    </IonLabel>
  </IonItem>
</template>
