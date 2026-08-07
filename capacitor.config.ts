import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'si.stenar.smsloc',
  appName: 'SMSLocFD',
  webDir: 'dist',
  // location bg
  android: { useLegacyBridge: true },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Capawesome EdgeToEdge applies WebView insets; Cap 8 SystemBars CSS must stay off
    SystemBars: {
      insetsHandling: 'disable',
    },
    Keyboard: {
      resizeOnFullScreen: false,
    },
  },
};

export default config;
