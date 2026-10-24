import type { CapacitorConfig } from '@capacitor/cli';
import app from './app.config.json' with { type: 'json' };

const config: CapacitorConfig = {
  appId: app.appId,
  appName: app.appName,
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0b0f14',
    preferredContentMode: 'mobile',
  },
};

export default config;
