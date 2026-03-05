import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Note: for Vite, env vars must be prefixed with VITE_
// You can set these in Netlify Environment Variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCJ23LSiXRmZp5C_hLX9LPxCQVKuzkpapk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yourtraveldiary-49331.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "yourtraveldiary-49331",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "yourtraveldiary-49331.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "717185172023",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:717185172023:web:c0c1a16ec165c8076b35b2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MD36K048T9"
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

// Analytics is optional and only works in the browser.
export async function initAnalytics() {
  if (typeof window === 'undefined') return null;
  if (!firebaseConfig.measurementId) return null;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(firebaseApp);
  } catch {
    return null;
  }
}
