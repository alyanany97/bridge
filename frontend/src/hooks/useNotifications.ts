/**
 * FCM push notification registration.
 *
 * Call useNotifications() once after the user is authenticated.
 * It requests notification permission, gets the FCM token, registers it
 * with the backend, and sets up the foreground message handler.
 *
 * You need:
 *   1. VITE_FIREBASE_VAPID_KEY in .env.local (from Firebase Console → Project Settings → Cloud Messaging)
 *   2. public/firebase-messaging-sw.js (service worker — see that file for instructions)
 */
import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messagingPromise } from "@/firebase";
import { api } from "@/api";
import { toast } from "sonner";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export function useNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId || !VAPID_KEY) return;

    let registered = false;

    async function register() {
      const messaging = await messagingPromise;
      if (!messaging) return; // Browser doesn't support FCM

      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token || registered) return;
        registered = true;

        await api("/api/v1/users/fcm-token", {
          method: "POST",
          body: JSON.stringify({ token }),
        });

        // Store token in sessionStorage so we can remove it on sign-out
        sessionStorage.setItem("fcmToken", token);

        // Handle foreground messages — show as toast since the app is open
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? "Bridge";
          const body = payload.notification?.body ?? "";
          toast(title, { description: body });
        });
      } catch {
        // Notification permission denied or FCM unavailable — silent fail
      }
    }

    register();
  }, [userId]);
}

/** Call on sign-out to stop notifications on this device. */
export async function unregisterFcmToken(): Promise<void> {
  const token = sessionStorage.getItem("fcmToken");
  if (!token) return;
  try {
    await api("/api/v1/users/fcm-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
    sessionStorage.removeItem("fcmToken");
  } catch {
    // Best-effort
  }
}
