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
    class="contact-item"
  >
    <IonAvatar slot="start" class="contact-avatar">
      <div v-if="message" class="msg-dot"></div>
      <img
        v-if="contact.image"
        :src="contact.image"
        :alt="contact.name"
        class="avatar-img"
      />
      <img
        v-else
        src="/assets/icons/avatar.svg"
        :alt="contact.name"
        class="avatar-fallback"
      />
    </IonAvatar>
    <IonLabel>
      <strong>{{ formatName(contact.name) }}</strong>

      <IonNote v-if="!response">
        {{ t('message.noLocationData') }}
      </IonNote>

      <IonNote v-if="message" class="note-sm">
        {{ t(`message.${message}`) }}
      </IonNote>
      <br v-if="message" />

      <IonText v-if="response" class="meta-sm">
        <span class="meta-label">{{ t('message.distance') }}</span
        >: {{ distance }}
        <span class="meta-label">{{ t('message.elevation') }}</span
        >: {{ elevation }}
      </IonText>
    </IonLabel>

    <div slot="end" class="end-top">
      <IonNote v-if="response" color="medium" class="note-xs">
        {{
          olderThen4Hours ? timeFormated : timeElapsed + ' ' + t('message.ago')
        }}
      </IonNote>
    </div>
    <div slot="end" class="end-bottom">
      <IonIcon
        :icon="locationOutline"
        class="status-icon"
        :class="`status-${status}`"
      ></IonIcon>
    </div>
  </IonItem>
</template>

<style scoped>
.contact-item {
  position: relative;
}
.contact-avatar {
  position: relative;
}
.msg-dot {
  position: absolute;
  top: 0.75rem;
  inset-inline-start: 0.75rem;
  z-index: 10;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background: var(--ion-color-primary);
}
.avatar-img {
  width: 2.5rem;
  height: 2.5rem;
  max-width: none;
  object-fit: none;
  object-position: center;
}
.avatar-fallback {
  filter: grayscale(1);
}
.note-sm,
.meta-sm {
  font-size: 0.875rem;
}
.meta-label {
  font-weight: 500;
}
.end-top,
.end-bottom {
  position: absolute;
  inset-inline-end: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  line-height: 0.75rem;
}
.end-top {
  top: 0.625rem;
  font-size: 0.75rem;
}
.end-bottom {
  bottom: 0.875rem;
  font-size: 1rem;
}
.note-xs {
  font-size: 0.75rem;
}
.status-icon.status-none {
  visibility: hidden;
}
.status-icon.status-gray,
.status-icon.status-none {
  color: var(--ion-color-medium);
}
.status-icon.status-green {
  color: var(--ion-color-success-shade);
}
.status-icon.status-orange {
  color: var(--ion-color-warning-shade);
}
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
