<script lang="ts" setup>
import { IonSpinner } from '@ionic/vue';

const props = defineProps<{ isLoading?: boolean }>();
</script>

<template>
  <div class="spinner-container" v-if="props.isLoading ?? true">
    <IonSpinner name="dots"></IonSpinner>
  </div>
</template>

<style scoped>
.spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
