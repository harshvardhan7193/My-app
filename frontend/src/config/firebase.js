import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref as dbRef,
  query as dbQuery,
  orderByChild,
  limitToLast,
  onValue,
  push as dbPush,
  remove as dbRemove,
  update as dbUpdate,
  serverTimestamp,
  get,
} from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase web app configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Realtime Database — used for live chat
export const db = getDatabase(app);

// Firebase Cloud Messaging — used for push notifications
export let messaging = null;
try {
  messaging = getMessaging(app);
} catch (err) {
  // Messaging not supported in this browser (e.g. no service worker)
  console.warn("Firebase Messaging not supported:", err.message);
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
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
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

const messagesRef = (coupleId) => dbRef(db, `chats/${coupleId}/messages`);

/**
 * Subscribe to the live message stream for a couple.
 * Returns an unsubscribe function (call it in useEffect cleanup).
 *
 * Loads only the most recent `limit` messages (newest-first window). Callers
 * paginate older history by re-subscribing with a larger limit. New messages
 * sent into the chat are still delivered in real time because the window is
 * anchored at the latest message via Firebase's `limitToLast`.
 *
 * @param {string} coupleId
 * @param {(messages: Array) => void} cb  receives messages sorted ascending by createdAt
 * @param {number} [limit=20]  how many of the latest messages to keep in the window
 */
export const subscribeMessages = (coupleId, cb, limit = 20) => {
  const q = dbQuery(
    messagesRef(coupleId),
    orderByChild("createdAt"),
    limitToLast(limit),
  );
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

/** Push a new message onto a couple's chat. Returns the new RTDB key immediately. */
export const pushMessage = (coupleId, message) => {
  const newRef = dbPush(messagesRef(coupleId));
  dbUpdate(newRef, {
    ...message,
    status: 'sent',
    createdAt: serverTimestamp(),
  });
  return newRef.key;
};

/** Remove a single message from a couple's chat. */
export const removeMessage = (coupleId, messageId) =>
  dbRemove(dbRef(db, `chats/${coupleId}/messages/${messageId}`));

/** Search all messages and return matching IDs and their required pagination limit */
export const searchAllMessages = async (coupleId, searchText) => {
  const snapshot = await get(messagesRef(coupleId));
  if (!snapshot.exists()) return [];

  const list = [];
  snapshot.forEach((child) => {
    list.push({ id: child.key, ...child.val() });
  });
  list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const matches = [];
  const lowerSearch = searchText.toLowerCase();

  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if ((m.text || "").toLowerCase().includes(lowerSearch)) {
      matches.push({
        id: m.id,
        indexFromEnd: list.length - i,
      });
    }
  }
  return matches;
};

/** Update the status of a specific message (sent, delivered, read) */
export const updateMessageStatus = (coupleId, messageId, status) => {
  const updates = { status };
  if (status === 'delivered') updates.deliveredAt = serverTimestamp();
  if (status === 'read') updates.readAt = serverTimestamp();
  return dbUpdate(dbRef(db, `chats/${coupleId}/messages/${messageId}`), updates);
};

export default app;
