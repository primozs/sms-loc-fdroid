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
    :class="[
      'img',
      {
        'h-auto w-full max-w-full object-cover object-center': true, // responsive
        'bg-gray-100 dark:bg-neutral-900': true, // loading bg
      },
      props.class && props.class,
    ]"
    :on-error="() => (error = true)"
    :data-msg-onerror="errorMsg"
  />
</template>

<style scoped>
.img {
  --img-err-bg-color: #e5e7eb;
}

[data-theme='dark'] .img {
  --img-err-bg-color: rgb(55 65 81 / 1);
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
