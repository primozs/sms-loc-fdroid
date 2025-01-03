<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import MainMenu from './MainMenu.vue';
import { useApp } from './useApp';

useApp();
</script>

<template>
  <IonApp>
    <MainMenu content-id="main-content" />
    <IonRouterOutlet id="main-content" />
  </IonApp>
</template>
