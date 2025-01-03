<script lang="ts" setup>
import {
  IonItem,
  IonLabel,
  IonAvatar,
  IonIcon,
  IonText,
  IonNote,
} from '@ionic/vue';
import { locationOutline } from 'ionicons/icons';
import { useI18n } from 'vue-i18n';
import { type ContactDisplay } from '@/services/useContactsData';
import { useListItemActionSheet } from './useListItemActionSheet';
import { useItemData } from './useItemData';
import { formatName } from '@/app/format';
import { computed } from 'vue';
import { vLongPress } from '@/app/longPress';

const props = defineProps<{
  contact: ContactDisplay;
}>();

const { t } = useI18n();

const contactRef = computed(() => {
  return props.contact;
});

const {
  response,
  distance,
  timeElapsed,
  timeFormated,
  elevation,
  status,
  olderThen4Hours,
  message,
} = useItemData(contactRef);

const { handleClick, requestLocationHandler } = useListItemActionSheet();

const handleLongPress = () => {
  requestLocationHandler(props.contact);
};
</script>

<template>
  <IonItem
    v-long-press="handleLongPress"
    @click="handleClick(contact)"
    :button="true"
    :detail="false"
    lines="full"
  >
    <IonAvatar slot="start">
      <div
        v-if="message"
        :class="[
          `
          absolute top-3 start-3 z-10
          w-3 h-3 rounded-full bg-[var(--ion-color-primary)]
        `,
        ]"
      ></div>
      <img
        v-if="contact.image"
        :src="contact.image"
        :alt="contact.name"
        class="w-10 h-10 max-w-none object-none object-center"
      />
      <img
        v-else
        src="/assets/icons/avatar.svg"
        :alt="contact.name"
        class="grayscale"
      />
    </IonAvatar>
    <IonLabel>
      <strong>{{ formatName(contact.name) }}</strong>

      <IonNote v-if="!response">
        {{ t('message.noLocationData') }}
      </IonNote>

      <IonNote v-if="message" class="text-sm">
        {{ t(`message.${message}`) }}
      </IonNote>
      <br v-if="message" />

      <IonText v-if="response" class="text-sm">
        <span class="font-medium">{{ t('message.distance') }}</span
        >: {{ distance }}
        <span class="font-medium">{{ t('message.elevation') }}</span
        >: {{ elevation }}
      </IonText>
    </IonLabel>

    <div
      slot="end"
      class="absolute top-2.5 text-xs flex items-center leading-3 end-3 gap-x-1"
    >
      <IonNote v-if="response" color="medium" class="text-xs">
        {{
          olderThen4Hours ? timeFormated : timeElapsed + ' ' + t('message.ago')
        }}
      </IonNote>
    </div>
    <div
      slot="end"
      class="absolute bottom-3.5 text-base flex items-center leading-3 end-3 gap-x-1"
    >
      <IonIcon
        :icon="locationOutline"
        :class="[
          {
            hidden: status === 'none',
            'text-gray-500 dark:text-gray-600':
              status === 'gray' || status === 'none',
            'text-green-700 dark:text-green-500': status === 'green',
            'text-orange-500 dark:text-orange-500': status === 'orange',
          },
        ]"
      ></IonIcon>
    </div>
  </IonItem>
</template>

<style scoped>
ion-label strong {
  display: block;
  max-width: calc(100% - 60px);
  overflow: hidden;
  text-overflow: ellipsis;
}

ion-label ion-note {
  font-size: 0.9rem;
}
</style>
