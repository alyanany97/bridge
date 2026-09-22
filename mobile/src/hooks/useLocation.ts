import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '@/stores/appStore';

// Setup notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUserLocation } = useAppStore();

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    const startTracking = async () => {
      try {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setError('Location permission denied');
          return;
        }

        // Get initial location
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });

        // Subscribe to location updates (every 30 seconds)
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000,
            distanceInterval: 50,
          },
          (location) => {
            setUserLocation({
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            });
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get location');
      } finally {
        setLoading(false);
      }
    };

    startTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [setUserLocation]);

  return { loading, error };
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });
  }, []);

  return { expoPushToken };
}

async function registerForPushNotificationsAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    if (!projectId) {
      throw new Error('Missing EXPO_PUBLIC_PROJECT_ID');
    }

    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return pushToken.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

export function usePushNotification() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        // Handle notification tap
        console.log('Notification tapped:', data);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
