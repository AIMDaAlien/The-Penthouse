# Expo Web Compatibility - SecureStore Fix

## Problem
When running a React Native Expo app on the web platform, authentication fails with errors because `expo-secure-store` is not supported on web browsers.

### Symptoms
- Registration and login fail silently or throw errors
- Console shows errors related to `SecureStore` not being available
- App works on iOS/Android but breaks on web

### Root Cause
`expo-secure-store` only works on native platforms (iOS/Android). It uses the device's secure enclave/keychain which doesn't exist in browsers.

```
❌ SecureStore.setItemAsync() - Not available on web
❌ SecureStore.getItemAsync() - Not available on web  
❌ SecureStore.deleteItemAsync() - Not available on web
```

---

## Solution: Cross-Platform Storage Abstraction

Create a unified storage interface that uses `SecureStore` on native and `localStorage` on web.

### Implementation

**`src/services/storage.ts`**
```typescript
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
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore!.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore!.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore!.deleteItemAsync(key);
  },
};

export default storage;
```

### Migration Steps

1. **Create the storage abstraction file** as shown above

2. **Find all SecureStore usages:**
   ```bash
   grep -r "SecureStore" src/
   ```

3. **Replace imports:**
   ```typescript
   // Before
   import * as SecureStore from 'expo-secure-store';
   
   // After
   import { storage } from './storage';
   ```

4. **Update method calls:**
   ```typescript
   // Before
   await SecureStore.setItemAsync('token', token);
   const token = await SecureStore.getItemAsync('token');
   await SecureStore.deleteItemAsync('token');
   
   // After
   await storage.setItem('token', token);
   const token = await storage.getItem('token');
   await storage.deleteItem('token');
   ```

---

## Common Files to Update

- **`AuthContext.tsx`** - Token storage during login/register/logout
- **`api.ts`** - Token retrieval for API interceptors
- **File upload functions** - Token headers for multipart uploads

---

## Testing

After implementing:

1. **Web:** Open `http://localhost:8081` and test login/register
2. **iOS Simulator:** Run `npx expo run:ios` and test auth
3. **Android Emulator:** Run `npx expo run:android` and test auth

All platforms should now handle authentication correctly.

---

## Security Note

⚠️ `localStorage` on web is **less secure** than native `SecureStore`. For production apps with sensitive data:
- Consider using encrypted cookies
- Implement token refresh mechanisms
- Use short-lived access tokens

---

## Related
- [[Expo Web - Input Focus Fix]]
- [[Authentication Troubleshooting - Port Mismatch]]
