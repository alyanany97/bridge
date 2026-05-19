/**
 * Firebase Cloud Messaging Service Worker
 *
 * This file MUST live at /public/firebase-messaging-sw.js so it is served
 * from the root of your domain (https://yourdomain.com/firebase-messaging-sw.js).
 *
 * It handles background push notifications — i.e. when the app is closed or
 * the user is on a different tab.
 *
 * SETUP REQUIRED:
 *   1. Replace the firebaseConfig values below with your actual project config.
 *      Find them in Firebase Console → Project Settings → General → Your apps.
 *   2. The config here must match your frontend .env.local values exactly.
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyB9WBMQe1JobMJGVYgJnVON7FuZFH4njVQ",
  authDomain: "helper-495902.firebaseapp.com",
  projectId: "helper-495902",
  storageBucket: "helper-495902.firebasestorage.app",
  messagingSenderId: "878901906578",
  appId: "1:878901906578:web:f20b16c592ec16363a2a4b",
});

const messaging = firebase.messaging();

// Handle background messages — shown as a system notification when app is closed
messaging.onBackgroundMessage((payload) => {
  const { title = "Bridge", body = "" } = payload.notification ?? {};
  const data = payload.data ?? {};

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",   // add a 192×192 app icon to /public/
    badge: "/badge-72.png",  // add a 72×72 monochrome badge to /public/
    data,
    // Deep-link to the right screen when user taps the notification
    tag: data.matchId ?? "bridge",
  });
});

// When user taps a notification, open the app at the right screen
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const matchId = event.notification.data?.matchId;
  const url = matchId ? `/match/${matchId}` : "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      clients.openWindow(url);
    })
  );
});
