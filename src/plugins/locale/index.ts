// Usage:

// import { Locale } from '@/plugins/locale';
// const ret = await Locale.setLocale({ value: 'sl' });

import { registerPlugin } from '@capacitor/core';

export interface LocalePlugin {
  setLocale(options: { value: string }): Promise<{ value: string }>;
}

const Locale = registerPlugin<LocalePlugin>('Locale');

export { Locale };
