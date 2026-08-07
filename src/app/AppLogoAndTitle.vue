<script lang="ts" setup>
import AppLogo from './AppLogo.vue';
</script>

<template>
  <div class="logo-wrap">
    <AppLogo class="logo" />
  </div>

  <div class="title-wrap">
    <h1 class="app-title">
      {{ $t('message.appname') }}
    </h1>
  </div>
</template>

<style scoped>
.logo-wrap {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
  margin-bottom: 0;
}
.logo {
  width: 60%;
  margin-left: auto;
  margin-right: auto;
  height: max-content;
}
.title-wrap {
  display: flex;
  justify-content: center;
}
.app-title {
  font-size: 1.875rem;
  line-height: 1.5rem;
  font-weight: 600;
}
</style>
