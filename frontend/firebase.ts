// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBGwG3OhJKGtmwQ2VV3tXXotpGIoSWuyFE",
  authDomain: "learn-it-now-69e25.firebaseapp.com",
  projectId: "learn-it-now-69e25",
  storageBucket: "learn-it-now-69e25.firebasestorage.app",
  messagingSenderId: "226137664558",
  appId: "1:226137664558:web:55624b6b192c739fd443bf",
  measurementId: "G-71M2M13SL2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persist across tabs & reloads (“remembered”)
await setPersistence(auth, browserLocalPersistence);

export const provider = new GoogleAuthProvider();
// Optional: request basic profile & email (default scopes are fine)
// provider.addScope("profile"); provider.addScope("email");

export async function signInWithGoogleRedirect() {
  await signInWithRedirect(auth, provider);
}

export async function handleRedirectResult() {
  // Call once on app start; no-op if user already cached
  try {
    await getRedirectResult(auth);
  } catch (e) {
    console.error("Google redirect error", e);
  }
}

export function onUserChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signOut() {
  await fbSignOut(auth);
}
