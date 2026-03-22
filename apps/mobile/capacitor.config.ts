/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'blog.penthouse.app',
  appName: 'The Penthouse',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: []
    }
  }
};

export default config;
