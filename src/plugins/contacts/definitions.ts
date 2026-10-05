import type { PermissionState } from '@capacitor/core';

export interface ContactsPermissionStatus {
  contacts: PermissionState;
}

export interface PickContactProjection {
  name?: boolean;
  phones?: boolean;
  image?: boolean;
}

export interface PickContactOptions {
  projection?: PickContactProjection;
}

export interface PickedContactPhone {
  type?: string;
  number?: string;
}

export interface PickedContact {
  contactId: string;
  name?: { display?: string };
  phones?: PickedContactPhone[];
  image?: { base64String?: string | null };
}

export interface PickContactResult {
  contact: PickedContact;
}

export interface ContactsPlugin {
  checkPermissions(): Promise<ContactsPermissionStatus>;
  requestPermissions(): Promise<ContactsPermissionStatus>;
  pickContact(options?: PickContactOptions): Promise<PickContactResult>;
}
