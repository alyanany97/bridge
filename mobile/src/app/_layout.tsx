import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { RootLayoutNav } from '@/navigation/RootLayoutNav';
import { useAppStore } from '@/stores/appStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated } = useAppStore();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <RootLayoutNav />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animationEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animationEnabled: false }} />
      </Stack>
    </>
  );
}
