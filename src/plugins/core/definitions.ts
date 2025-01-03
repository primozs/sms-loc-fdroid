import type { PermissionState } from '@capacitor/core';

export type PermissionStatus = {
  sms: PermissionState;
  location: PermissionState;
  background: PermissionState;
  internet: PermissionState;
};

export type CallbackID = string;

export interface ClearWatchOptions {
  id: CallbackID;
}

export type WatchCallback = (options: { action: string }, err?: any) => void;

export interface Options {}

export interface CorePlugin {
  watchSmsReceiver(
    options: Options,
    callback: WatchCallback,
  ): Promise<CallbackID>;
  clearSmsReceiverWatch(options: ClearWatchOptions): Promise<void>;
  checkLocationService(): Promise<{ isEnabled: boolean }>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
  openApplicationSettings(): Promise<void>;
  openLocationSettings(options?: { message?: string }): Promise<void>;
  convertToE164PhoneNumFormat(options: {
    address: string;
  }): Promise<{ address: string }>;
}
