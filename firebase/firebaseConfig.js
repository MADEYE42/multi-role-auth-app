import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDWrJjXy5_9z8FkEM4t3RIPO1sP83EtiZU",
  authDomain: "miniproject-ddfbc.firebaseapp.com",
  projectId: "miniproject-ddfbc",
  storageBucket: "miniproject-ddfbc.firebasestorage.app",
  messagingSenderId: "432237849307",
  appId: "1:432237849307:web:4bde9370e1595038a6bafe"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);