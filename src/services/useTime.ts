import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTime = defineStore('use-time-now', () => {
  const now = ref(new Date().getTime());

  const timer = () => {
    setTimeout(() => {
      now.value = new Date().getTime();
      timer();
    }, 1000);
  };

  timer();
  return { now };
});
