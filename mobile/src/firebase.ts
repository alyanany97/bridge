import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB9WBMQe1JobMJGVYgJnVON7FuZFH4njVQ",
  authDomain: "helper-495902.firebaseapp.com",
  projectId: "helper-495902",
  storageBucket: "helper-495902.firebasestorage.app",
  messagingSenderId: "878901906578",
  appId: "1:878901906578:web:f20b16c592ec16363a2a4b",
  databaseURL: "https://helper-495902-default-rtdb.firebaseio.com/",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
