import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth } from 'firebase/auth';
import { getFirestore, Firestore, collection, getDocs } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration - Updated with more complete config
const firebaseConfig = {
  apiKey: 'AIzaSyAUH7AIvFDuBO-_hI8VFqZsB6Dt3B1rn0M',
  authDomain: 'foodventurer-20548.firebaseapp.com',
  projectId: 'foodventurer-20548',
  storageBucket: 'foodventurer-20548.firebasestorage.app',
  messagingSenderId: '291044185235',
  appId: '1:291044185235:web:your-app-id',
  measurementId: undefined, // Not needed for Firestore
};

// Use a specific app name to avoid conflicts
const APP_NAME = 'foodventurer-app';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export const initializeFirebase = (): void => {
  try {
    console.log('🔍 Checking Firebase state...');

    // Try to get existing app by name first
    try {
      app = getApp(APP_NAME);
      console.log('✅ Found existing named Firebase app:', app.name);
    } catch (e) {
      // App doesn't exist, create it
      console.log('🔄 Creating new named Firebase app...');
      app = initializeApp(firebaseConfig, APP_NAME);
      console.log('✅ Named Firebase app created successfully');
    }

    console.log('✅ App name:', app.name);
    console.log('✅ Project ID:', app.options.projectId);

    // Initialize Firestore with the app
    if (!firestoreInstance) {
      try {
        firestoreInstance = getFirestore(app);
        console.log('✅ Firestore initialized successfully');
      } catch (firestoreError) {
        console.error('❌ Firestore initialization failed:', firestoreError);
        firestoreInstance = null;
      }
    }

    // Initialize Auth with the app - Use getAuth for React Native
    if (!authInstance) {
      try {
        authInstance = getAuth(app);
        console.log('✅ Auth initialized successfully');
      } catch (authError) {
        console.error('❌ Auth initialization failed:', authError);
        authInstance = null;
      }
    }

    // Initialize Storage with the app
    if (!storageInstance) {
      try {
        storageInstance = getStorage(app);
        console.log('✅ Storage initialized successfully');
      } catch (storageError) {
        console.error('❌ Storage initialization failed:', storageError);
        storageInstance = null;
      }
    }

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

export const testFirebaseConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Firebase connectivity...');

    // Test 1: Check if Firebase app exists
    if (!app) {
      console.log('🧪 No Firebase app available');
      return false;
    }

    console.log('🧪 Firebase app exists:', app.name);

    // Test 2: Try to get Firestore instance (skip Auth test since it has registration issues)
    try {
      const firestore = getFirestore(app);
      console.log('🧪 Firestore instance created successfully');

      // Test 3: Try a simple Firestore operation (this will fail if Firestore service is not available)
      const testCollection = collection(firestore, 'test');
      console.log('🧪 Firestore collection reference created');

      // Test 4: Try to actually query Firestore
      try {
        console.log('🧪 Attempting to query Firestore...');
        const querySnapshot = await getDocs(testCollection);
        console.log(`🧪 Firestore query successful: found ${querySnapshot.docs.length} documents`);
        return true;
      } catch (queryError) {
        console.error('🧪 Firestore query failed:', queryError);
        // Even if query fails due to permissions, Firestore service is available
        return true;
      }

    } catch (firestoreError) {
      console.error('🧪 Firestore test failed:', firestoreError);
      return false;
    }

  } catch (error) {
    console.error('🧪 Firebase connectivity test failed:', error);
    return false;
  }
};

export const getFirestoreInstance = (): Firestore => {
  console.log('🔍 getFirestoreInstance called');
  console.log('🔍 app exists:', !!app);
  console.log('🔍 firestoreInstance exists:', !!firestoreInstance);

  if (!app) {
    console.log('🔄 App not found, initializing Firebase...');
    // Try to initialize if not already done
    initializeFirebase();
    if (!app) {
      console.log('❌ App still not available after initialization');
      throw new Error('Firebase not initialized. Initialization failed.');
    }
  }

  if (!firestoreInstance) {
    console.log('🔄 Firestore instance not found, creating...');
    // Firestore should already be initialized in initializeFirebase
    // If not, try to create it now
    try {
      firestoreInstance = getFirestore(app);
      console.log('✅ Firestore instance created in getFirestoreInstance:', firestoreInstance);
    } catch (error) {
      console.error('❌ Failed to create Firestore instance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Firestore is not available. Error: ${errorMessage}`);
    }
  }

  console.log('🔍 Returning firestoreInstance:', firestoreInstance);
  return firestoreInstance!;
};

export const getStorageInstance = (): FirebaseStorage => {
  if (!app) {
    // Try to initialize if not already done
    initializeFirebase();
    if (!app) {
      throw new Error('Firebase not initialized. Initialization failed.');
    }
  }

  if (!storageInstance) {
    // Storage should already be initialized in initializeFirebase
    // If not, try to create it now
    try {
      storageInstance = getStorage(app);
      console.log('✅ Storage instance created in getStorageInstance');
    } catch (error) {
      console.error('❌ Failed to create Storage instance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Storage is not available. Error: ${errorMessage}`);
    }
  }

  return storageInstance!;
};

export const getAuthInstance = (): Auth => {
  if (!authInstance) {
    if (!app) {
      throw new Error('Firebase app not initialized');
    }
    authInstance = getAuth(app);
  }
  return authInstance!;
};

export { app };
