import { registerPlugin } from '@capacitor/core';
import type { ContactsPlugin } from './definitions';

const Contacts = registerPlugin<ContactsPlugin>('Contacts');

export * from './definitions';
export { Contacts };
