<script lang="ts" setup>
import { useIonRouter } from '@ionic/vue';

type Props = {
  routerLink: string;
  class?: string;
  routerDirection?: 'back' | 'forward' | 'root';
  routerAction?: 'push' | 'replace' | 'pop';
  callback?: () => void;
};

const props = defineProps<Props>();
const ionRouter = useIonRouter();

const handleClick = () => {
  ionRouter.navigate(
    props.routerLink,
    props.routerDirection ?? 'forward',
    props.routerAction ?? 'push',
  );
  props.callback && props.callback();
};
</script>
<template>
  <a :href="props.routerLink" :class="props.class" @click.prevent="handleClick"
    ><slot
  /></a>
</template>
