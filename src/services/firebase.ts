import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey:            'AIzaSyC9Tt900Af8izL9OPqSgIaOR6iWgZt6eg4',
  authDomain:        'kisanwise-f18e4.firebaseapp.com',
  projectId:         'kisanwise-f18e4',
  storageBucket:     'kisanwise-f18e4.firebasestorage.app',
  messagingSenderId: '711791370155',
  appId:             '1:711791370155:web:eef85e6802781c186ffcee',
  measurementId:     'G-RXYS9VG8ZP',
};

// Singleton pattern — safe for HMR
const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Analytics only in browser prod
isSupported().then(yes => { if (yes) getAnalytics(app); }).catch(() => {});

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// ─── Auth helpers ──────────────────────────────────────────────

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  return user ? user.getIdToken() : null;
}

export { app, auth, db };
