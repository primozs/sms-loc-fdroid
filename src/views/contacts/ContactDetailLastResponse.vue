<script lang="ts" setup>
import { IonListHeader, IonGrid, IonRow, IonCol } from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { useItemData } from './useItemData';
import type { ContactDisplay } from '@/services/useContactsData';
import { computed } from 'vue';
import Link from '@/components/Link.vue';

const props = defineProps<{ contact: ContactDisplay | null }>();
const { t } = useI18n();
const constactData = computed(() => props.contact);
const {
  response,
  battery,
  distance,
  elevation,
  locationFormated,
  timeElapsed,
  timeFormated,
  speed,
} = useItemData(constactData);
</script>

<template>
  <IonListHeader v-if="response">
    <h2 class="text-lg font-medium !mt-0 !mb-0">
      {{ t('message.lastKnownLocation') }}
    </h2>
  </IonListHeader>

  <IonGrid class="p-3" v-if="response">
    <IonRow>
      <IonCol>
        <span class="font-medium">{{ t('message.time') }}</span
        >: {{ timeFormated }}
      </IonCol>
      <IonCol>
        <span class="font-medium">{{ t('message.elapsed') }}</span
        >: {{ timeElapsed }}
      </IonCol>
    </IonRow>
    <IonRow>
      <IonCol>
        <span class="font-medium">{{ t('message.distance') }}</span
        >: {{ distance }}
      </IonCol>
      <IonCol>
        <span class="font-medium">{{ t('message.elevation') }}</span
        >: {{ elevation }}
      </IonCol>
    </IonRow>
    <IonRow>
      <IonCol>
        <span class="font-medium">{{ t('message.battery') }}</span
        >: {{ battery }}
      </IonCol>
      <IonCol>
        <span class="font-medium">{{ t('message.speed') }}</span
        >: {{ speed }}
      </IonCol>
    </IonRow>
    <IonRow>
      <IonCol>
        <span class="font-medium">{{ t('message.location') }}</span
        >:
        <Link :router-link="`/contacts/list/map/${response?.id}`">{{
          locationFormated
        }}</Link>
      </IonCol>
    </IonRow>
  </IonGrid>
</template>
