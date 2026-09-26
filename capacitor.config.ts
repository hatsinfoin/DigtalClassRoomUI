import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.digitalclassroom',
  appName: 'DigitalClassRoom',
  webDir: 'dist/app/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: [
      '10.242.216.254',
      '10.242.216.254:8080',
      'localhost',
      '10.0.2.2'
    ]
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
