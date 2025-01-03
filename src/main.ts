import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { IonicVue } from '@ionic/vue';
import { createI18n } from 'vue-i18n';
import { messages } from '@/locales/messages';
import { themePlugin } from './app/themePlugin';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { NodeJS } from 'capacitor-nodejs';

import './theme/tailwind.css';

import '@ionic/vue/css/core.css';

import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

import './theme/variables.css';
import { Preferences } from '@capacitor/preferences';
import {
  initSqlite,
  sqliteVuePlugin,
  type SqliteVuePluginProps,
} from '@/services/sqliteService';
import { logError } from '@/services/useLogger';
import { initErrorLogging } from '@/services/useLogger';
import { Logger } from './services/logger';
import { Capacitor } from '@capacitor/core';
import { config } from './config';

const initApp = (locale: string, sqliteProps: SqliteVuePluginProps) => {
  const i18n = createI18n({
    locale: locale,
    fallbackLocale: 'en',
    availableLocales: ['en', 'sl'],
    messages,
    legacy: false,
  });

  const pinia = createPinia();

  const app = createApp(App)
    .use(themePlugin)
    .use(i18n)
    .use(IonicVue, {
      mode: 'ios',
    })
    .use(pinia)
    .use(router)
    .use(VueQueryPlugin)
    .use(sqliteVuePlugin(sqliteProps));

  router.isReady().then(() => {
    app.mount('#app');
  });

  initErrorLogging();

  app.config.errorHandler = (err: any) => {
    logError(err);
  };

  return app;
};

const main = async () => {
  const { value } = await Preferences.get({ key: 'locale' });
  const locale = value ?? 'en';

  const sqliteProps = await initSqlite();
  Logger.getInstance(sqliteProps.db);

  const options = {
    env: {
      PORT: config.SERVER_PORT,
      OFFLINE_MAP_DOWNLOAD_URL: config.OFFLINE_MAP_DOWNLOAD_URL,
    },
  };

  if (Capacitor.isNativePlatform()) {
    NodeJS.start(options);
  }

  initApp(locale, sqliteProps);
};

main();
