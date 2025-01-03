<script lang="ts" setup>
import AppLogo from './AppLogo.vue';
</script>

<template>
  <div class="flex justify-center mt-10 mb-0">
    <AppLogo class="w-3/5 mx-auto h-max" />
  </div>

  <div class="flex justify-center">
    <h1 class="text-3xl leading-6 font-semibold">
      {{ $t('message.appname') }}
    </h1>
  </div>
</template>
