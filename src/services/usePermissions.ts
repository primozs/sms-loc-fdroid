import { type Ref, computed, ref } from 'vue';
import { Capacitor, type PermissionState } from '@capacitor/core';
import { Core } from '@/plugins/core';
import { useI18n } from 'vue-i18n';
import { SMS } from '@/plugins/sms';
import { GeoLocation } from '@/plugins/geolocation';
import { Contacts } from '@capacitor-community/contacts';
import { useLocationService } from '@/services/useLocation';
import { Alert } from '@/components/Alert';

export const usePermissions = () => {
  const { t } = useI18n();
  const locService = useLocationService();

  const locAlertLabels = computed(() => {
    const title = t('message.locationServicesCheckTitle');
    const message = t('message.locationServicesCheckMessage');
    return { title, message };
  });

  const permsissionLabels = computed(() => {
    const cancel = t('message.cancel');
    const confirm = t('message.confirm');
    const permissionNotFullySet = t('message.permissionNotFullySet');
    const doYouWantToSetupPermissions = t(
      'message.doYouWantToSetupPermissions',
    );
    const permissionLocation = t('message.permissionLocation');
    const permissionLocationWhy = t('message.permissionLocationWhy');
    const permissionBgLocation = t('message.permissionBgLocation');
    const permissionBgLocationsWhy = t('message.permissionBgLocationsWhy');
    const permissionSms = t('message.permissionSms');
    const permissionSmsWhy = t('message.permissionSmsWhy');
    const permissionContacts = t('message.permissionContacts');
    const permissionContactsWhy = t('message.permissionContactsWhy');
    return {
      cancel,
      confirm,
      permissionNotFullySet,
      doYouWantToSetupPermissions,
      permissionLocation,
      permissionLocationWhy,
      permissionBgLocation,
      permissionBgLocationsWhy,
      permissionSms,
      permissionSmsWhy,
      permissionContacts,
      permissionContactsWhy,
    };
  });

  const setupPermissions = ref(false);

  const checkLocationAndPermissions = async () => {
    const locationEnabled = await isLocationServiceEnabled();
    locService.locServiceEnabled = locationEnabled;

    if (!locationEnabled) {
      await openLocationSettingsDialog({
        title: locAlertLabels.value.title,
        message: locAlertLabels.value.message,
        cancelLabel: permsissionLabels.value.cancel,
        confirmLabel: permsissionLabels.value.confirm,
      });
    }

    if (!locationEnabled) {
      // display notification in ui
      // give up
      return 1;
    }

    const permissionToRequest = await checkPermissionsStatus({
      setupPermissions,
      alertTitle: permsissionLabels.value.permissionNotFullySet,
      alertMessage: permsissionLabels.value.doYouWantToSetupPermissions,
      cancelLabel: permsissionLabels.value.cancel,
      confirmLabel: permsissionLabels.value.confirm,
    });

    if (!setupPermissions.value) return 1;

    if (permissionToRequest) {
      await requestPermisson(permissionToRequest, {
        cancelLabel: permsissionLabels.value.cancel,
        confirmLabel: permsissionLabels.value.confirm,
        permissionLocation: permsissionLabels.value.permissionLocation,
        permissionLocationWhy: permsissionLabels.value.permissionLocationWhy,
        permissionBgLocation: permsissionLabels.value.permissionBgLocation,
        permissionBgLocationsWhy:
          permsissionLabels.value.permissionBgLocationsWhy,
        permissionSms: permsissionLabels.value.permissionSms,
        permissionSmsWhy: permsissionLabels.value.permissionSmsWhy,
        permissionContacts: permsissionLabels.value.permissionContacts,
        permissionContactsWhy: permsissionLabels.value.permissionContactsWhy,
      });
    }
  };

  return { checkLocationAndPermissions };
};

export const areAllPermisionsGranted = async () => {
  if (Capacitor.getPlatform() === 'web') return true;
  const status = await Core.checkPermissions();
  const anyNotGranted = Object.entries(status)
    .map((item) => item[1] === 'granted')
    .find((item) => item === false);
  if (anyNotGranted === undefined) {
    return true;
  } else {
    return false;
  }
};

const checkPermissionsStatus = async (options: {
  setupPermissions: Ref<boolean>;
  alertTitle: string;
  alertMessage: string;
  cancelLabel: string;
  confirmLabel: string;
}) => {
  if (Capacitor.getPlatform() === 'web') return null;
  const status = await Core.checkPermissions();
  const allGranted = await areAllPermisionsGranted();
  if (allGranted) return;

  if (!options.setupPermissions.value) {
    const { value } = await Alert.confirm({
      title: options.alertTitle ?? 'Permissions are not fully set',
      message: options.alertMessage ?? 'Do you want to setup',
      okLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
    });
    options.setupPermissions.value = value;
  }

  if (options.setupPermissions.value) {
    // without backround
    const entries = Object.entries(status);
    const withoutBackground = entries.filter(
      ([permission]) => permission !== 'background',
    );
    for (const [permission, state] of withoutBackground) {
      if (state !== 'granted') {
        return { name: permission, state };
      }
    }

    const { contacts } = await Contacts.checkPermissions();
    if (contacts !== 'granted') {
      return { name: 'contacts', state: contacts };
    }

    // check background
    const withBackground = entries.filter(
      ([permission]) => permission === 'background',
    );
    const background = withBackground[0];

    if (background && background[1] !== 'granted') {
      return { name: 'background', state: background[1] };
    }
  }

  return null;
};

const requestPermisson = async (
  permission: { name: string; state: PermissionState },
  labels: {
    permissionLocation: string;
    permissionLocationWhy: string;
    permissionBgLocation: string;
    permissionBgLocationsWhy: string;
    permissionSms: string;
    permissionSmsWhy: string;
    permissionContacts: string;
    permissionContactsWhy: string;
    cancelLabel: string;
    confirmLabel: string;
  },
) => {
  if (Capacitor.getPlatform() === 'web') return null;

  if (permission.name === 'location') {
    const { value } = await Alert.confirm({
      title: labels.permissionLocation,
      message: labels.permissionLocationWhy,
      okLabel: labels.confirmLabel,
      cancelLabel: labels.cancelLabel,
    });

    if (value) {
      await GeoLocation.requestPermissions();
    }
  }

  if (permission.name === 'background') {
    const { value } = await Alert.confirm({
      title: labels.permissionBgLocation,
      message: labels.permissionBgLocationsWhy,
      okLabel: labels.confirmLabel,
      cancelLabel: labels.cancelLabel,
    });

    if (value) {
      await Core.requestPermissions();
    }
  }

  if (permission.name === 'sms') {
    const { value } = await Alert.confirm({
      title: labels.permissionSms,
      message: labels.permissionSmsWhy,
      okLabel: labels.confirmLabel,
      cancelLabel: labels.cancelLabel,
    });

    if (value) {
      await SMS.requestPermissions();
    }
  }

  if (permission.name === 'contacts') {
    const { value } = await Alert.confirm({
      title: labels.permissionContacts,
      message: labels.permissionContactsWhy,
      okLabel: labels.confirmLabel,
      cancelLabel: labels.cancelLabel,
    });

    if (value) {
      await Contacts.requestPermissions();
    }
  }
};

const isLocationServiceEnabled = async () => {
  if (Capacitor.getPlatform() === 'web') {
    return false;
  }
  const res = await Core.checkLocationService();
  return res.isEnabled;
};

const openLocationSettingsDialog = async (options: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}) => {
  if (Capacitor.getPlatform() === 'web') return;

  const { value } = await Alert.confirm({
    title: options.title ?? 'Location services are disabled',
    message: options.message ?? 'Do you want to open location settings?',
    okLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
  });

  if (value) {
    await Core.openLocationSettings();
  }
};
