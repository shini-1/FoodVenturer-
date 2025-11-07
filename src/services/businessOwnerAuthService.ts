import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from '@react-native-firebase/firestore';
import { firestoreInstance, authInstance } from '../../services/firebase';

export interface BusinessOwnerProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  businessName?: string;
  role: 'business_owner';
  createdAt: Date;
  isVerified: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  businessName?: string;
}

class BusinessOwnerAuthService {
  private get auth() {
    return authInstance;
  }

  private get firestore() {
    return firestoreInstance;
  }

  /**
   * Sign up a new business owner
   */
  async signUp(signUpData: SignUpData): Promise<BusinessOwnerProfile> {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        signUpData.email,
        signUpData.password
      );

      // Create business owner profile
      const profile: BusinessOwnerProfile = {
        uid: userCredential.user.uid,
        email: signUpData.email,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        phoneNumber: signUpData.phoneNumber,
        businessName: signUpData.businessName,
        role: 'business_owner',
        createdAt: new Date(),
        isVerified: false,
      };

      // Save to Firestore
      await this.saveProfile(profile);

      return profile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Sign in existing business owner
   */
  async signIn(email: string, password: string): Promise<BusinessOwnerProfile> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);

      // Get profile from Firestore
      const profile = await this.getProfile(userCredential.user.uid);

      if (!profile) {
        throw new Error('Business owner profile not found');
      }

      return profile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(idToken: string): Promise<BusinessOwnerProfile> {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(this.auth, credential);

      // Check if profile exists, create if not
      let profile = await this.getProfile(userCredential.user.uid);

      if (!profile) {
        // Create new profile from Google account
        profile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          firstName: userCredential.user.displayName?.split(' ')[0] || '',
          lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ') || '',
          role: 'business_owner',
          createdAt: new Date(),
          isVerified: true, // Google accounts are pre-verified
        };

        await this.saveProfile(profile);
      }

      return profile;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<BusinessOwnerProfile | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return null;

    return await this.getProfile(currentUser.uid);
  }

  /**
   * Update user profile
   */
  async updateProfile(uid: string, updates: Partial<BusinessOwnerProfile>): Promise<void> {
    try {
      const profileRef = doc(this.firestore, 'businessOwners', uid);
      await updateDoc(profileRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Check if email is already registered
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const q = query(
        collection(this.firestore, 'businessOwners'),
        where('email', '==', email)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private methods
   */
  private async saveProfile(profile: BusinessOwnerProfile): Promise<void> {
    const profileRef = doc(this.firestore, 'businessOwners', profile.uid);
    await setDoc(profileRef, {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
    });
  }

  private async getProfile(uid: string): Promise<BusinessOwnerProfile | null> {
    try {
      const profileRef = doc(this.firestore, 'businessOwners', uid);
      const profileDoc = await getDoc(profileRef);

      if (!profileDoc.exists()) {
        return null;
      }

      const data = profileDoc.data();
      return {
        ...data,
        createdAt: new Date(data.createdAt),
      } as BusinessOwnerProfile;
    } catch (error) {
      return null;
    }
  }

  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already registered';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      default:
        return error.message || 'An error occurred';
    }
  }
}

export const businessOwnerAuthService = new BusinessOwnerAuthService();
