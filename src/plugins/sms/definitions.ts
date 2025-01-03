interface PermissionStatus {}

export type SMSPermissionType = 'SMS';

export type CallbackID = string;

export interface SmsPluginPermissions {
  permissions: SMSPermissionType[];
}

export interface SmsClearWatchOptions {
  id: CallbackID;
}

export interface Sms {
  address: string;
  body: string;
  date_sent: string;
  date: string;
}

export type WatchSmsCallback = (position: Sms | null, err?: any) => void;

export interface SmsOptions {}

export interface SmsPlugin {
  watchSms(
    options: SmsOptions,
    callback: WatchSmsCallback,
  ): Promise<CallbackID>;
  clearSmsWatch(options: SmsClearWatchOptions): Promise<void>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(
    permissions?: SmsPluginPermissions,
  ): Promise<PermissionStatus>;
  sendSms(options: {
    address: string;
    message: string;
    replaceLineBreaks?: boolean;
    androidIntent?: boolean;
  }): Promise<{
    status: 'ok';
  }>;
}
