import { registerPlugin } from '@capacitor/core';
import type { CorePlugin } from './definitions';

const Core = registerPlugin<CorePlugin>('Core');

export * from './definitions';
export { Core };
