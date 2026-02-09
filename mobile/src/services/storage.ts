/**
 * Cross-platform secure storage abstraction
 * Uses expo-secure-store on native (iOS/Android)
 * Uses localStorage on web
 */
import { Platform } from 'react-native';

// Only import SecureStore on native platforms
let SecureStore: typeof import('expo-secure-store') | null = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export const storage = {
  /**
   * Get an item from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore!.getItemAsync(key);
  },

  /**
   * Set an item in secure storage
   */
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore!.setItemAsync(key, value);
  },

  /**
   * Delete an item from secure storage
   */
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore!.deleteItemAsync(key);
  },
};

export default storage;
