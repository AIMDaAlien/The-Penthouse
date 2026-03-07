import { Capacitor } from '@capacitor/core';

const ENV_API_URL = import.meta.env.VITE_API_URL;

function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function resolveApiBase(): string {
  if (ENV_API_URL) return ENV_API_URL;
  // Local Android testing uses `adb reverse tcp:3000 tcp:3000`,
  // which makes the host API available at the device's localhost.
  if (isNativeAndroid()) return 'http://localhost:3000';
  return 'http://localhost:3000';
}
