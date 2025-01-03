<script lang="ts" setup>
import { IonLabel, IonAvatar } from '@ionic/vue';
import { formatName } from '@/app/format';
import { type ContactDisplay } from '@/services/useContactsData';

defineProps<{ contact: ContactDisplay | null }>();
</script>

<template>
  <div class="flex gap-5 m-4">
    <IonAvatar>
      <img
        v-if="contact?.image"
        :src="contact.image"
        :alt="contact.name"
        class="max-w-none object-none object-center"
      />
      <img
        v-else
        src="/assets/icons/avatar.svg"
        :alt="contact?.name"
        class="grayscale"
      />
    </IonAvatar>
    <IonLabel>
      <h1>{{ formatName(contact?.name) }}</h1>
      <h2>
        <a :href="`tel:${contact?.address}`">{{ contact?.address }}</a>
      </h2>
    </IonLabel>
  </div>
</template>
