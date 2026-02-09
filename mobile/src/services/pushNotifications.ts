/**
 * Push Notifications Service
 * 
 * Handles Expo push notification registration and handling
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications
 * Returns the Expo push token or null if registration fails
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Only works on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    const token = tokenData.data;
    console.log('Got Expo push token:', token);

    // Register token with our backend
    await sendTokenToServer(token);

    return token;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Send push token to server for storage
 */
async function sendTokenToServer(token: string): Promise<void> {
  try {
    await api.post('/push/register', {
      token,
      deviceType: Platform.OS,
    });
    console.log('Push token registered with server');
  } catch (error) {
    console.error('Failed to register push token with server:', error);
  }
}

/**
 * Unregister push token (call on logout)
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete('/push/unregister');
    console.log('Push token unregistered');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}

/**
 * Set up notification listeners
 * Call in root layout on app start
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  // Handle notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  // Handle user tapping on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification tapped:', response);
    onNotificationTapped?.(response);
    
    // Extract chat ID from notification data and navigate
    const data = response.notification.request.content.data;
    if (data?.chatId) {
      // Navigation will be handled by the callback
      console.log('Should navigate to chat:', data.chatId);
    }
  });

  // Return cleanup function
  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}

/**
 * Get current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await setBadgeCount(0);
}
