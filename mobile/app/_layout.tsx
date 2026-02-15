import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ServerProvider } from '../src/context/ServerContext';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Ubuntu_300Light, Ubuntu_400Regular, Ubuntu_500Medium, Ubuntu_700Bold } from '@expo-google-fonts/ubuntu';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import '../global.css';
import { BackgroundLayer } from '../src/components/BackgroundLayer';
import { ToastProvider } from '../src/components/Toast';
import { NotificationListener } from '../src/components/NotificationListener';
import { registerForPushNotifications, setupNotificationListeners } from '../src/services/pushNotifications';

// Configure Reanimated logger to suppress false positive warnings from third-party libs
// See: https://docs.swmansion.com/react-native-reanimated/docs/debugging/logger-configuration/
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, // Disable strict mode to prevent "Reading from value during render" warnings
});

// Separate component to handle navigation logic inside Provider
function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated and trying to access auth screens
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  // Push Notifications Setup
  useEffect(() => {
    if (user) {
      registerForPushNotifications();
      
      const cleanup = setupNotificationListeners(
        (notification) => {
          // Handle foreground notification if needed (ToastListener handles it mostly)
          console.log('Foreground push:', notification);
        },
        (response) => {
          // Handle tap
          const data = response.notification.request.content.data;
          if (data?.chatId) {
             router.push(`/chat/${data.chatId}`);
          }
        }
      );
      
      return cleanup;
    }
  }, [user]);


  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        {/* Transparent loading state over background */}
        <ActivityIndicator size="large" color="#cba6f7" />
      </View>
    );
  }

  // Stack is transparent so BackgroundLayer shows through
  return (
    <Stack screenOptions={{ 
        headerShown: false, 
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'fade_from_bottom', // Subtle default
    }}>
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="register" options={{ animation: 'fade' }} />
      <Stack.Screen 
        name="settings" 
        options={{ 
            headerShown: false, 
            presentation: 'transparentModal',
            animation: 'fade',
        }} 
      />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
    </Stack>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Ubuntu_300Light,
    Ubuntu_400Regular,
    Ubuntu_500Medium,
    Ubuntu_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#cba6f7" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
        <ServerProvider>
          <ToastProvider>
            <StatusBar style="light" />
            
            {/* Persistent Background Layer at the very root */}
            <BackgroundLayer />
            
            {/* Navigation Overlay - Centered with Max Width for Desktop */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
               <View style={{ width: '100%', maxWidth: 1200, height: '100%', overflow: 'hidden' }}>
                  <RootNavigation />
               </View>
            </View>
            
            <NotificationListener />
          </ToastProvider>
        </ServerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
  );
}
