import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and fetch the Expo Push Token.
 * This token can be sent to your backend API to target this device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // Only physical devices support push notifications
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return undefined;
  }

  // Set up android channels
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token: permission not granted');
    return undefined;
  }

  // Retrieve EAS project ID from app.json configurations
  const projectId = 
    Constants.expoConfig?.extra?.eas?.projectId ?? 
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('EAS Project ID not found in app.json configuration');
    return undefined;
  }

  try {
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    
    console.log('Expo Push Token:', pushTokenString);
    return pushTokenString;
  } catch (error) {
    console.error('Error fetching Expo Push Token:', error);
    return undefined;
  }
}
