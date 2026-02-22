import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ServerProvider } from '../src/context/ServerContext';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Ubuntu_300Light, Ubuntu_400Regular, Ubuntu_500Medium, Ubuntu_700Bold } from '@expo-google-fonts/ubuntu';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { useFonts as useCustomFonts } from 'expo-font';
import '../global.css';
import { BackgroundLayer } from '../src/components/BackgroundLayer';
import { ToastProvider } from '../src/components/Toast';
import { NotificationListener } from '../src/components/NotificationListener';
import { ServerStatusBanner } from '../src/components/ServerStatusBanner';
import { AppUpdateGate } from '../src/components/AppUpdateGate';
import { registerForPushNotifications, setupNotificationListeners } from '../src/services/pushNotifications';

import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false, 
});

function RootNavigation() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)' || segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  useEffect(() => {
    if (user) {
      registerForPushNotifications();
      const cleanup = setupNotificationListeners(
        (notification) => console.log('Foreground push:', notification),
        (response) => {
          const data = response.notification.request.content.data;
          if (data?.chatId) router.push(`/chat/${data.chatId}`);
        }
      );
      return cleanup;
    }
  }, [user]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#cba6f7" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ 
        headerShown: false, 
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'fade_from_bottom',
    }}>
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="register" options={{ animation: 'fade' }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
    </Stack>
  );
}

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  const [googleFontsLoaded] = useFonts({
    Ubuntu_300Light,
    Ubuntu_400Regular,
    Ubuntu_500Medium,
    Ubuntu_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  const [customFontsLoaded] = useCustomFonts({
    'Erode-SemiBold': require('../assets/fonts/Erode-SemiBold.ttf'),
  });

  if (!googleFontsLoaded || !customFontsLoaded) {
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
            
            <BackgroundLayer />
            
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
               <View style={{ width: '100%', maxWidth: 1200, height: '100%', overflow: 'hidden' }}>
                  <RootNavigation />
               </View>
            </View>

            <ServerStatusBanner />
            <AppUpdateGate />
            <NotificationListener />
          </ToastProvider>
        </ServerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
  );
}
