import admin from 'firebase-admin';

let firebaseApp = null;

export const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  console.log('✅ Firebase Admin SDK initialized');
  return firebaseApp;
};

// Get Firebase Realtime Database reference
export const getDatabase = () => admin.database();

// Get Firebase Messaging instance (for push notifications)
export const getMessaging = () => admin.messaging();

export default admin;
