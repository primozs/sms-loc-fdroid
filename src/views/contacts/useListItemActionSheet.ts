import {
  actionSheetController,
  toastController,
  useIonRouter,
  type ActionSheetButton,
} from '@ionic/vue';
import { SMS } from '@/plugins/sms';
import { useQueryClient } from '@tanstack/vue-query';
import { logError } from '@/services/useLogger';
import { useDataStore } from '@/services/useDataStore';
import type { ContactDisplay } from '@/services/useContactsData';
import { useI18n } from 'vue-i18n';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import { useModalSendSms } from './useModalSendSms';
import { Alert } from '@/components/Alert';
import { formatName } from '@/app/format';

export const useListItemActionSheet = () => {
  const { requestStore, contactsStore } = useDataStore();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const ionRouter = useIonRouter();
  const sendSmsModal = useModalSendSms();

  const requestLocationHandler = async (contact: ContactDisplay) => {
    try {
      await SMS.checkPermissions();
    } catch {
      await SMS.requestPermissions();
    }

    try {
      await SMS.sendSms({
        address: contact.address,
        message: 'Loc?',
      });

      await requestStore.addRequest({
        id: 0,
        type: 'sent',
        address: contact.address,
        contactId: contact.contactId,
        ts: new Date().getTime(),
      });

      queryClient.invalidateQueries({
        queryKey: [`/contacts`],
      });
      queryClient.refetchQueries({
        queryKey: [`/contacts`],
      });

      const toast = await toastController.create({
        message: t('message.requestSent'),
        duration: 3000,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } catch (error) {
      logError(error);
    }
  };

  const handleClick = async (contact: ContactDisplay) => {
    const lastReceivedResponse = contact.responses.find(
      (item) => item.type === 'received',
    );

    const buttons: ActionSheetButton[] = [];
    const cancelButton = {
      text: t('message.cancel'),
      role: 'cancel',
      data: {
        action: 'cancel',
      },
    };
    buttons.push(cancelButton);

    const requestLocationButton = {
      text: t('message.requestLocation'),
      data: {
        action: 'requestLocation',
      },
      async handler() {
        await requestLocationHandler(contact);
      },
    };
    buttons.push(requestLocationButton);

    const sendMessageButton = {
      text: t('message.sendMessage'),
      data: {
        action: 'sendMessage',
      },
      async handler() {
        sendSmsModal.setContactModel(contact);
      },
    };
    buttons.push(sendMessageButton);

    const navigateToButton: ActionSheetButton = {
      text: t('message.navigateTo'),
      data: {
        action: 'navigateTo',
      },
      async handler() {
        try {
          if (lastReceivedResponse) {
            const locString = `${lastReceivedResponse.lat},${lastReceivedResponse.lon}`;
            // https://capacitorjs.com/docs/apis/share
            // https://github.com/osmandapp/OsmAnd-ios/issues/447
            // https://github.com/osmandapp/OsmAnd/blob/eae44566d9c3bb79110b9af827e289630bfe7ee5/OsmAnd/AndroidManifest.xml
            // https://capacitorjs.com/docs/apis/app-launcher#openurloptions
            await Share.share({
              title: contact.name + ' ' + locString,
              text: `https://osmand.net/go.html?lat=${lastReceivedResponse.lat}&lon=${lastReceivedResponse.lon}&z=15`,
            });

            await Clipboard.write({
              string: locString,
            });
            const toast = await toastController.create({
              message: t('message.locationCopyPaste'),
              duration: 3000,
              position: 'top',
              color: 'success',
            });
            await toast.present();
          }
        } catch (error) {
          logError(error);
        }
      },
    };
    if (lastReceivedResponse) buttons.push(navigateToButton);

    const detailsButton = {
      text: t('message.details'),
      data: {
        action: 'details',
      },
      handler() {
        ionRouter.navigate(`/contacts/list/${contact.id}`, 'forward', 'push');
      },
    };
    buttons.push(detailsButton);

    const deleteButton = {
      text: t('message.delete'),
      role: 'destructive',
      data: {
        action: 'delete',
      },
      async handler() {
        try {
          Alert.confirm({
            title: t('message.delete'),
            subHeader: formatName(contact.name),
            message: t('message.areYouSure'),
            okLabel: t('message.confirm'),
            cancelLabel: t('message.cancel'),
          }).then(({ value }) => {
            if (value) {
              contactsStore.removeContactByContactId(contact.contactId);
              queryClient.invalidateQueries({
                queryKey: [`/contacts`],
              });
              queryClient.refetchQueries({
                queryKey: [`/contacts`],
              });
            }
          });
        } catch (error) {
          logError(error);
        }
      },
    };
    buttons.push(deleteButton);

    const actionSheet = await actionSheetController.create({
      header: contact.name,
      buttons,
    });

    await actionSheet.present();
  };

  return { handleClick, requestLocationHandler };
};
