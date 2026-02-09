# Expo Web - Input Focus Fix

## Problem
Input fields on login and registration screens lose focus immediately after clicking on them when running the app on Expo Web.

### Symptoms
- Clicking an input field briefly shows the cursor, then it disappears
- Cannot type in form fields
- Works fine on iOS/Android, only broken on web
- Frustrating UX where forms are unusable

---

## Root Cause

The `TouchableWithoutFeedback` component with `Keyboard.dismiss` is commonly used to dismiss the keyboard when tapping outside input fields on mobile. However, on web, this intercepts click events on the input fields themselves, causing focus to be lost.

### Problematic Pattern
```tsx
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View>
    <TextInput placeholder="Username" />
    <TextInput placeholder="Password" />
  </View>
</TouchableWithoutFeedback>
```

On web, every click (including on inputs) triggers `Keyboard.dismiss`, stealing focus.

---

## Solution: Platform-Aware Wrapper

Create a component that only applies keyboard dismissal on native platforms:

```tsx
import { Platform, View, TouchableWithoutFeedback, Keyboard } from 'react-native';

const DismissKeyboardView = ({ children }: { children: React.ReactNode }) => {
  // On web, just render children without touch handler
  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  
  // On native, wrap with keyboard dismiss behavior
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {children}
    </TouchableWithoutFeedback>
  );
};
```

### Usage
```tsx
// Before
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View style={styles.container}>
    {/* form content */}
  </View>
</TouchableWithoutFeedback>

// After
<DismissKeyboardView>
  <View style={styles.container}>
    {/* form content */}
  </View>
</DismissKeyboardView>
```

---

## Alternative: Conditional Import

For a cleaner approach, create a shared component:

**`src/components/DismissKeyboardView.tsx`**
```tsx
import React from 'react';
import { 
  Platform, 
  View, 
  TouchableWithoutFeedback, 
  Keyboard,
  ViewStyle 
} from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function DismissKeyboardView({ children, style }: Props) {
  if (Platform.OS === 'web') {
    return <View style={[{ flex: 1 }, style]}>{children}</View>;
  }
  
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
```

---

## Files Commonly Affected

- `login.tsx` - Login form
- `register.tsx` - Registration form  
- Any screen with `KeyboardAvoidingView` + `TouchableWithoutFeedback`
- Modal forms
- Search screens with inputs

---

## Testing

1. **Web:** Click each input field, verify cursor stays and you can type
2. **iOS:** Tap outside inputs, verify keyboard dismisses
3. **Android:** Same as iOS - verify keyboard dismiss works

---

## Why Not Just Remove TouchableWithoutFeedback?

Removing it entirely breaks the mobile UX. Users expect to be able to tap outside a form to dismiss the keyboard. The platform-aware approach preserves this behavior on mobile while fixing web.

---

## Related
- [[Expo Web - SecureStore Fix]]
- [[React Native Platform-Specific Code]]
