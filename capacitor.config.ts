import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tarteeb.app',
  appName: 'Tarteeb',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#0e141f',
    allowMixedContent: false,
    webContentsDebuggingEnabled: true
  }
};

export default config;
