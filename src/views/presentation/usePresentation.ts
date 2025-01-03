import { Preferences } from '@capacitor/preferences';
import { defineStore } from 'pinia';
import { ref } from 'vue';

const PRESENTATION_KEY = 'presentation-viewed';

export const getPresentationHasBeenViewed = async () => {
  const { value } = await Preferences.get({
    key: PRESENTATION_KEY,
  });
  return value === 'viewed';
};

export const usePresentation = defineStore('usePresentation', () => {
  const beenViewed = ref(false);

  getPresentationHasBeenViewed().then((viewed) => {
    beenViewed.value = viewed;
  });

  const setPresentationViewed = async (arg: boolean) => {
    beenViewed.value = arg;

    await Preferences.set({
      key: PRESENTATION_KEY,
      value: arg ? 'viewed' : '',
    });
  };

  return { beenViewed, setPresentationViewed };
});
