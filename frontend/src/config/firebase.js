import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref as dbRef,
  query as dbQuery,
  orderByChild,
  limitToLast,
  onValue,
  push as dbPush,
  remove as dbRemove,
  serverTimestamp,
} from 'firebase/database';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase web app configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1bA0cy_lX565piyVbu84CGe6wnofsGBU",
  authDomain: "my-app-78849.firebaseapp.com",
  projectId: "my-app-78849",
  storageBucket: "my-app-78849.firebasestorage.app",
  messagingSenderId: "963186646615",
  appId: "1:963186646615:web:8875f06a70440ec9b08d12",
  measurementId: "G-8ZMR0X3M9D",
  databaseURL: "https://my-app-78849-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const VAPID_KEY = "BNFPYQ3GIC_zT9b2RUbJ4IPd50BoUZXMJ9OQ4jLDgVQcBND6ZNTXsezN9HqBU_j9SF5-zzaqR7KmQJ69JBlMqNk";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Realtime Database — used for live chat
export const db = getDatabase(app);

// Firebase Cloud Messaging — used for push notifications
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (err) {
  // Messaging not supported in this browser (e.g. no service worker)
  console.warn('Firebase Messaging not supported:', err.message);
}

/**
 * Request permission and get FCM device token.
 * Call this after user logs in, then send the token to the backend
 * via PUT /api/users/me { fcmToken: token }
 */
export const requestNotificationPermission = async () => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Listen for foreground push notifications.
 * Call this once in your app root.
 */
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

// ────────────────────────────────────────────────────────────
// Realtime chat helpers (couple-scoped at chats/<coupleId>/messages)
// ────────────────────────────────────────────────────────────

const messagesRef = (coupleId) =>
  dbRef(db, `chats/${coupleId}/messages`);

/**
 * Subscribe to the live message stream for a couple.
 * Returns an unsubscribe function (call it in useEffect cleanup).
 *
 * @param {string} coupleId
 * @param {(messages: Array) => void} cb  receives messages sorted ascending by createdAt
 */
export const subscribeMessages = (coupleId, cb) => {
  const q = dbQuery(messagesRef(coupleId), orderByChild('createdAt'), limitToLast(500));
  const unsub = onValue(q, (snapshot) => {
    const list = [];
    snapshot.forEach((child) => {
      list.push({ id: child.key, ...child.val() });
    });
    // RTDB returns in query order but inserts via push() may race; sort defensively.
    list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    cb(list);
  });
  return unsub;
};

/** Push a new message onto a couple's chat. Returns the new RTDB key. */
export const pushMessage = async (coupleId, message) => {
  const result = await dbPush(messagesRef(coupleId), {
    ...message,
    createdAt: serverTimestamp(),
  });
  return result.key;
};

/** Remove a single message from a couple's chat. */
export const removeMessage = (coupleId, messageId) =>
  dbRemove(dbRef(db, `chats/${coupleId}/messages/${messageId}`));

export default app;
