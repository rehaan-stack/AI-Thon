import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const runtimeEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env ?? {};

const firebaseConfig: FirebaseOptions = {
  apiKey: runtimeEnv.VITE_FIREBASE_API_KEY,
  authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: runtimeEnv.VITE_FIREBASE_APP_ID,
  measurementId: runtimeEnv.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredConfigKeys: Array<keyof FirebaseOptions> = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
];

export const firebaseConfigured = requiredConfigKeys.every((key) => {
  const value = firebaseConfig[key];
  return typeof value === 'string' && value.trim().length > 0;
});

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

