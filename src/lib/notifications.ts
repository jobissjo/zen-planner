import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
const isAndroid = Platform.OS === 'android';

let Notifications: any;

if (isExpoGo && isAndroid) {
  Notifications = {
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async () => {},
    AndroidImportance: {
      MIN: 1,
      LOW: 2,
      DEFAULT: 3,
      HIGH: 4,
      MAX: 5,
      NONE: 0,
    },
    getPermissionsAsync: async () => ({ status: 'undetermined', granted: false, expires: 'never', canAskAgain: true }),
    requestPermissionsAsync: async () => ({ status: 'undetermined', granted: false, expires: 'never', canAskAgain: true }),
    getExpoPushTokenAsync: async () => ({ data: '' }),
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  };
} else {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.warn('expo-notifications failed to load, falling back to mock:', error);
    Notifications = {
      setNotificationHandler: () => {},
      setNotificationChannelAsync: async () => {},
      AndroidImportance: {
        MIN: 1,
        LOW: 2,
        DEFAULT: 3,
        HIGH: 4,
        MAX: 5,
        NONE: 0,
      },
      getPermissionsAsync: async () => ({ status: 'undetermined', granted: false, expires: 'never', canAskAgain: true }),
      requestPermissionsAsync: async () => ({ status: 'undetermined', granted: false, expires: 'never', canAskAgain: true }),
      getExpoPushTokenAsync: async () => ({ data: '' }),
      addNotificationReceivedListener: () => ({ remove: () => {} }),
      addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
    };
  }
}

// Configure notification behavior when app is in foreground
if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request notification permissions and fetch the Expo Push Token.
 * This token can be sent to your backend API to target this device.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // In Expo Go on Android, skip registration entirely to avoid any issues
  if (isExpoGo && isAndroid) {
    console.log('Skipping push notification registration in Expo Go Android');
    return undefined;
  }

  // Only physical devices support push notifications
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return undefined;
  }

  // Set up android channels
  if (Platform.OS === 'android' && Notifications && typeof Notifications.setNotificationChannelAsync === 'function') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  // Check current permission status
  if (Notifications && typeof Notifications.getPermissionsAsync === 'function') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token: permission not granted');
      return undefined;
    }
  } else {
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
    if (Notifications && typeof Notifications.getExpoPushTokenAsync === 'function') {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      
      console.log('Expo Push Token:', pushTokenString);
      return pushTokenString;
    }
    return undefined;
  } catch (error) {
    console.error('Error fetching Expo Push Token:', error);
    return undefined;
  }
}

export { Notifications };
