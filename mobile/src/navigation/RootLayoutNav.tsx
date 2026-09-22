import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAppStore } from '@/stores/appStore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase';

export function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, setAuthenticated, setUser } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthenticated(true);
        setUser({
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          role: 'helper',
          stats: {
            itemsPosted: 0,
            itemsClaimed: 0,
            deliveriesCompleted: 0,
            rating: 0,
          },
        });

        const inAuthGroup = segments[0] === '(auth)';
        if (inAuthGroup) {
          router.replace('/');
        }
      } else {
        setAuthenticated(false);
        setUser(null);

        const inAuthGroup = segments[0] === '(auth)';
        if (!inAuthGroup) {
          router.replace('/login');
        }
      }
    });

    return () => unsubscribe();
  }, [segments, isAuthenticated]);
}
