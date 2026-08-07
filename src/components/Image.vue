<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

type Props = {
  src: string;
  alt: string;
  class?: string;
  width: number;
  height: number;
};

const props = defineProps<Props>();

const { t } = useI18n();

const error = ref(false);
const errorMsg = t('message.error');
</script>
<template>
  <img
    :src="props.src"
    :alt="props.alt"
    :width="props.width"
    :height="props.height"
    class="img"
    :class="props.class"
    :on-error="() => (error = true)"
    :data-msg-onerror="errorMsg"
  />
</template>

<style scoped>
.img {
  height: auto;
  width: 100%;
  max-width: 100%;
  object-fit: cover;
  object-position: center;
  background-color: var(--ion-color-step-100, #e5e7eb);
  --img-err-bg-color: var(--ion-color-step-100, #e5e7eb);
}

img:after {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  background-color: var(--img-err-bg-color);
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  content: attr(alt) ' ' attr(data-msg-onerror);
  padding: 20px;
  text-align: center;
}
</style>
