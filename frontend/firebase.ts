// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFunctions, httpsCallable } from 'firebase/functions';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBGwG3OhJKGtmwQ2VV3tXXotpGIoSWuyFE",
  authDomain: "learn-it-now-69e25.firebaseapp.com",
  projectId: "learn-it-now-69e25",
  storageBucket: "learn-it-now-69e25.firebasestorage.app",
  messagingSenderId: "226137664558",
  appId: "1:226137664558:web:55624b6b192c739fd443bf",
  measurementId: "G-71M2M13SL2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const functions = getFunctions(app);
export const createStripeAccount = httpsCallable(functions, 'createStripeAccount');