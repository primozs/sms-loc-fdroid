import { Preferences } from '@capacitor/preferences';
import { toastController } from '@ionic/vue';
import { defineStore } from 'pinia';
import { ref, watchEffect } from 'vue';

const DEV_MODE_KEY = 'dev-mode';

export const useDevMode = defineStore('useDevMode', () => {
  const isDevMode = ref(false);

  Preferences.get({
    key: DEV_MODE_KEY,
  }).then(({ value }) => {
    isDevMode.value = value === 'dev';
  });

  const setDevMode = async (arg: boolean) => {
    isDevMode.value = arg;

    await Preferences.set({
      key: DEV_MODE_KEY,
      value: arg ? 'dev' : '',
    });
  };

  return { isDevMode, setDevMode };
});

export const useDevSwitcher = () => {
  const dev = useDevMode();
  const timeout = ref<ReturnType<typeof setTimeout>>();
  const clickCount = ref(0);

  watchEffect(() => {
    if (clickCount.value >= 5) {
      clickCount.value = 0;
      const mode = !dev.isDevMode;
      dev.setDevMode(mode);

      toastController
        .create({
          message: 'DEV MODE: ' + mode,
          duration: 3000,
          position: 'top',
        })
        .then((toast) => {
          return toast.present();
        });
    }

    clearTimeout(timeout.value);

    timeout.value = setTimeout(() => {
      clickCount.value = 0;
    }, 1000);
  });

  const devClickHandler = () => {
    clickCount.value = clickCount.value + 1;
  };

  return { devClickHandler };
};
