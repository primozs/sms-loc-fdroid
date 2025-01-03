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
    CapacitorNodeJS: {
      nodeDir: 'nodejs',
      startMode: 'manual',
    },
  },
};

export default config;
