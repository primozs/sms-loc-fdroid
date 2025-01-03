import { registerPlugin } from '@capacitor/core';
import type { SmsPlugin } from './definitions';

const SMS = registerPlugin<SmsPlugin>('Sms');

export * from './definitions';
export { SMS };
