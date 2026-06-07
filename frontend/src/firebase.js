import { initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA1YHr1qfZMGG1Cv_1aRn8AYBTBUTAkgsY",
  authDomain: "scholarsync-ced15.firebaseapp.com",
  projectId: "scholarsync-ced15",
  storageBucket: "scholarsync-ced15.appspot.com",   // ✅ fixed
  messagingSenderId: "592106131032",
  appId: "1:592106131032:web:d996e7057555ac3a8fc42d",
  measurementId: "G-VYRNBQH217"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error("Failed to set auth persistence:", error);
});
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
