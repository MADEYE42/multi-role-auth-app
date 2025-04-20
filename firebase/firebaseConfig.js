import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6PXBmpNpndCCNfKePl_lppFY5upIcryQ",
  authDomain: "mini-project-5df4a.firebaseapp.com",
  projectId: "mini-project-5df4a",
  storageBucket: "mini-project-5df4a.firebasestorage.app",
  messagingSenderId: "911645403669",
  appId: "1:911645403669:web:e4f0683559dd51f7ffbc1c",
  measurementId: "G-MCDQV5RCSK"
};

// Initialize Firebase
let app;
try {
  console.log('Initializing Firebase with config:', JSON.stringify(firebaseConfig, null, 2));
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully:', {
    name: app.name,
    options: app.options,
  });
} catch (error) {
  console.error('Firebase initialization error:', {
    message: error.message,
    code: error.code,
    stack: error.stack,
  });
  throw error;
}

// Initialize Firebase Auth with persistence
let auth;
try {
  console.log('Initializing Firebase Auth with AsyncStorage persistence...');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log('Firebase Auth initialized:', {
    apiKey: auth.apiKey,
    authDomain: auth.authDomain,
    appName: auth.app?.name || 'undefined',
    currentUser: auth.currentUser?.uid || 'none',
  });
} catch (error) {
  console.error('Firebase Auth initialization error:', {
    message: error.message,
    code: error.code,
    stack: error.stack,
  });
  throw error;
}

// Initialize Firestore
let db;
try {
  console.log('Initializing Firestore...');
  db = getFirestore(app);
  console.log('Firestore initialized successfully');
} catch (error) {
  console.error('Firestore initialization error:', {
    message: error.message,
    code: error.code,
    stack: error.stack,
  });
  throw error;
}

// Function to debug auth state
const debugAuthState = () => {
  console.log('Debugging auth state:', {
    apiKey: auth?.apiKey,
    authDomain: auth?.authDomain,
    appName: auth?.app?.name || 'undefined',
    currentUser: auth?.currentUser?.uid || 'none',
  });
};

// Export initialized services and debug function
export { auth, db, debugAuthState };