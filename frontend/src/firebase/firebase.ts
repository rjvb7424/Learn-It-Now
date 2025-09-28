import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);