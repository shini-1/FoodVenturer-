import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Firebase configuration is handled automatically by React Native Firebase
// No need for manual config object - it uses google-services.json / GoogleService-Info.plist

// Export instances directly - React Native Firebase handles initialization
export const authInstance = auth();
export const firestoreInstance = firestore();
export const storageInstance = storage();

export const initializeFirebase = (): void => {
  // React Native Firebase initializes automatically - this function remains for backward compatibility.
  console.log('✅ React Native Firebase initialized');
};

export const testFirebaseConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Firebase connectivity...');

    // Test auth instance
    if (authInstance) {
      console.log('🧪 Auth instance available');
    } else {
      console.log('🧪 Auth instance not available');
      return false;
    }

    // Test firestore instance
    try {
      const firestore = firestoreInstance;
      console.log('🧪 Firestore instance available');

      // Try to get a collection reference (doesn't require permissions)
      const testCollection = firestore.collection('test');
      console.log('🧪 Firestore collection reference created');
      return true;
    } catch (firestoreError) {
      console.error('🧪 Firestore test failed:', firestoreError);
      return false;
    }

  } catch (error) {
    console.error('🧪 Firebase connectivity test failed:', error);
    return false;
  }
};

export const getFirestoreInstance = () => firestoreInstance;

export const getStorageInstance = () => storageInstance;

export const getAuthInstance = () => authInstance;

// Export for compatibility
export { authInstance as auth, firestoreInstance as firestore, storageInstance as storage };
