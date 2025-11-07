import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { app } from '../../services/firebase';

export interface AdminProfile {
  uid: string;
  email: string;
  role: 'admin';
  firstName: string;
  lastName: string;
  adminLevel: 'super_admin' | 'moderator' | 'support';
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

class AdminAuthService {
  private readonly ADMINS_COLLECTION = 'admins';

  /**
   * Sign in as admin - separate from business owners
   */
  async signIn(email: string, password: string): Promise<AdminProfile> {
    try {
      // Use direct Firebase functions
      if (!app) {
        throw new Error('Firebase app not initialized');
      }
      const auth = getAuth(app);
      const firestore = getFirestore(app);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Verify this is an admin account
      const adminDoc = await getDoc(doc(firestore, this.ADMINS_COLLECTION, uid));
      if (!adminDoc.exists()) {
        await signOut(auth);
        throw new Error('Access denied: Not an admin account');
      }

      const adminData = adminDoc.data();
      if (!adminData?.isActive) {
        await signOut(auth);
        throw new Error('Account suspended. Contact support.');
      }

      // Update last login
      await updateDoc(doc(firestore, this.ADMINS_COLLECTION, uid), {
        lastLogin: new Date(),
      });

      return {
        uid,
        email: adminData.email,
        role: 'admin',
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        adminLevel: adminData.adminLevel || 'support',
        createdAt: adminData.createdAt?.toDate() || new Date(),
        lastLogin: new Date(),
        isActive: adminData.isActive,
      };
    } catch (error: any) {
      console.error('Admin sign-in error:', error);
      throw new Error(error.message || 'Admin authentication failed');
    }
  }

  /**
   * Create new admin account (super admin only)
   */
  async createAdmin(adminData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    adminLevel: 'super_admin' | 'moderator' | 'support';
  }): Promise<AdminProfile> {
    try {
      // First create Firebase auth user
      if (!app) {
        throw new Error('Firebase app not initialized');
      }
      const auth = getAuth(app);
      const firestore = getFirestore(app);

      const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, adminData.password);
      const uid = userCredential.user.uid;

      // Create admin profile in Firestore
      const adminProfile: Omit<AdminProfile, 'uid'> = {
        email: adminData.email,
        role: 'admin',
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        adminLevel: adminData.adminLevel,
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
      };

      await setDoc(doc(firestore, this.ADMINS_COLLECTION, uid), adminProfile);

      return { uid, ...adminProfile };
    } catch (error: any) {
      console.error('Create admin error:', error);
      throw new Error(error.message || 'Failed to create admin account');
    }
  }

  /**
   * Get current admin profile
   */
  async getCurrentUser(): Promise<AdminProfile | null> {
    try {
      if (!app) {
        return null;
      }
      const auth = getAuth(app);
      const firestore = getFirestore(app);

      const currentUser = auth.currentUser;

      if (!currentUser) return null;

      const adminDoc = await getDoc(doc(firestore, this.ADMINS_COLLECTION, currentUser.uid));
      if (!adminDoc.exists()) return null;

      const adminData = adminDoc.data();
      return {
        uid: currentUser.uid,
        email: adminData.email,
        role: 'admin',
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        adminLevel: adminData.adminLevel || 'support',
        createdAt: adminData.createdAt?.toDate() || new Date(),
        lastLogin: adminData.lastLogin?.toDate() || new Date(),
        isActive: adminData.isActive,
      };
    } catch (error) {
      console.error('Get current admin error:', error);
      return null;
    }
  }

  /**
   * Reset admin password
   */
  async resetPassword(email: string): Promise<void> {
    try {
      if (!app) {
        throw new Error('Firebase app not initialized');
      }
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset admin password error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  /**
   * Sign out admin
   */
  async signOut(): Promise<void> {
    try {
      if (!app) {
        throw new Error('Firebase app not initialized');
      }
      const auth = getAuth(app);
      await signOut(auth);
    } catch (error: any) {
      console.error('Admin sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  /**
   * Update admin profile
   */
  async updateProfile(uid: string, updates: Partial<AdminProfile>): Promise<void> {
    try {
      if (!app) {
        throw new Error('Firebase app not initialized');
      }
      const firestore = getFirestore(app);
      await updateDoc(doc(firestore, this.ADMINS_COLLECTION, uid), {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error: any) {
      console.error('Update admin profile error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  /**
   * Deactivate admin account
   */
  async deactivateAdmin(uid: string): Promise<void> {
    try {
      if (!app) {
        throw new Error('Firebase app not initialized');
      }
      const firestore = getFirestore(app);
      await updateDoc(doc(firestore, this.ADMINS_COLLECTION, uid), {
        isActive: false,
        deactivatedAt: new Date(),
      });
    } catch (error: any) {
      console.error('Deactivate admin error:', error);
      throw new Error(error.message || 'Failed to deactivate admin');
    }
  }

  /**
   * Reactivate admin account
   */
  async reactivateAdmin(uid: string): Promise<void> {
    try {
      if (!app) {
        throw new Error('Firebase app not initialized');
      }
      const firestore = getFirestore(app);
      await updateDoc(doc(firestore, this.ADMINS_COLLECTION, uid), {
        isActive: true,
        reactivatedAt: new Date(),
      });
    } catch (error: any) {
      console.error('Reactivate admin error:', error);
      throw new Error(error.message || 'Failed to reactivate admin');
    }
  }
}

export const adminAuthService = new AdminAuthService();
