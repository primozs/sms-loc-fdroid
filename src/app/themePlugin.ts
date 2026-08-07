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

const themeColors = (theme: string) => ({
  statusBar: theme === 'light' ? '#f7f7f7' : '#1f1f1f',
  navigationBar: theme === 'light' ? '#f7f7f7' : '#0d0d0d',
});

const applySystemChrome = async (theme: string) => {
  if (!Capacitor.isNativePlatform()) return;

  const { statusBar, navigationBar } = themeColors(theme);

  await NavigationBar.setColor({ color: navigationBar });
  await NavigationBar.setStyle({
    style:
      theme === 'light' ? NavigationBarStyle.Light : NavigationBarStyle.Dark,
  });
  await StatusBar.setStyle({
    style: theme === 'light' ? Style.Light : Style.Dark,
  });
  // Capawesome EdgeToEdge owns WebView insets + bar paint (SystemBars insetsHandling: disable)
  await EdgeToEdge.setStatusBarColor({ color: statusBar });
  await EdgeToEdge.setNavigationBarColor({ color: navigationBar });
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

    await applySystemChrome(userTheme);

    const theme = ref<string>(userTheme);

    const toggleTheme = async () => {
      const newTheme = theme.value === 'light' ? 'dark' : 'light';

      await applySystemChrome(newTheme);

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
