import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Add your RTDB URL to .env.local as VITE_FIREBASE_DATABASE_URL
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Realtime Database — used exclusively for live driver location (high-frequency writes)
export const rtdb = getDatabase(app);

// Offline persistence — Firestore caches reads locally, reducing reads by 40-60% for
// returning users. Silent fail in environments that don't support IndexedDB (e.g. SSR).
enableIndexedDbPersistence(db).catch(() => {});

// FCM Messaging — only available in browsers that support service workers
export const messagingPromise: Promise<ReturnType<typeof getMessaging> | null> =
  isSupported().then((ok) => (ok ? getMessaging(app) : null));
