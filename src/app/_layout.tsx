import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Listen for notifications arriving while the app is in the foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });

    // Listen for when a user interacts with/taps a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User interacted with notification:', response);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';
    const inAdminGroup = (segments[0] as string) === 'admin';
    const inTabsGroup = (segments[0] as string) === '(tabs)';

    if (!session) {
      // If not logged in, redirect to login unless already in auth screens
      if (!inAuthGroup) {
        router.replace('/login' as any);
      }
    } else {
      // If logged in, redirect to respective portal
      if (session.role === 'admin') {
        if (!inAdminGroup) {
          router.replace('/admin' as any);
        }
      } else {
        if (!inTabsGroup) {
          router.replace('/dashboard' as any);
        }
      }
    }
  }, [session, loading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {loading && <AnimatedSplashOverlay />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>

  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
