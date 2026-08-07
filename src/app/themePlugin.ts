import { ref, type App } from 'vue';
import {
  NavigationBar,
  Style as NavigationBarStyle,
} from '@capawesome/capacitor-navigation-bar';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

const THEME_KEY = 'theme-preference';

const applyNavigationBar = async (theme: string) => {
  const color = theme === 'light' ? '#f7f7f7' : '#0d0d0d';
  await NavigationBar.setColor({ color });
  await NavigationBar.setStyle({
    style:
      theme === 'light' ? NavigationBarStyle.Light : NavigationBarStyle.Dark,
  });
};

export const themePlugin = {
  install: async (app: App) => {
    const { value: storedTheme } = await Preferences.get({
      key: THEME_KEY,
    });

    const themePref = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    const userTheme = storedTheme ?? themePref;
    window.document.firstElementChild?.setAttribute('data-theme', userTheme);

    await applyNavigationBar(userTheme);

    if (Capacitor.isNativePlatform()) {
      const statusBarColor = userTheme === 'light' ? '#f7f7f7' : '#1f1f1f';
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({
        style: userTheme === 'light' ? Style.Light : Style.Dark,
      });
      StatusBar.setBackgroundColor({ color: statusBarColor });
      EdgeToEdge.setBackgroundColor({ color: statusBarColor });
    }

    const theme = ref<string>(userTheme);

    const toggleTheme = async () => {
      const newTheme = theme.value === 'light' ? 'dark' : 'light';

      await applyNavigationBar(newTheme);

      if (Capacitor.isNativePlatform()) {
        const statusBarColor = newTheme === 'light' ? '#f7f7f7' : '#1f1f1f';
        StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.setStyle({
          style: newTheme === 'light' ? Style.Light : Style.Dark,
        });
        StatusBar.setBackgroundColor({ color: statusBarColor });
        EdgeToEdge.setBackgroundColor({ color: statusBarColor });
      }

      document.firstElementChild?.setAttribute('data-theme', newTheme);

      await Preferences.set({
        key: THEME_KEY,
        value: newTheme,
      });

      theme.value = newTheme;
    };

    app.provide('theme', {
      theme,
      toggleTheme,
    });
  },
};
