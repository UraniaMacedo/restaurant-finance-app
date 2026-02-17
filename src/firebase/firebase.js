// Import the functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDUhy5x5BviidDT2niy5q91inPybYVMkzg",
  authDomain: "restaurant-finance-app.firebaseapp.com",
  projectId: "restaurant-finance-app",
  storageBucket: "restaurant-finance-app.firebasestorage.app",
  messagingSenderId: "558411376122",
  appId: "1:558411376122:web:5615931fd6b7c01a1f3043",
};

console.log("Firebase project:", firebaseConfig.projectId);
console.log("Auth domain:", firebaseConfig.authDomain);

// Initialize app
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Auth
export const auth = getAuth(app);

// ✅ Persist login (stay logged in)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence enabled ✅");
  })
  .catch((err) => {
    console.error("Persistence error:", err);
  });

