import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { getAuthInstance } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { businessOwnerAuthService, BusinessOwnerProfile } from '../src/services/businessOwnerAuthService';
import { adminAuthService, AdminProfile } from '../src/services/adminAuthService';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginAsBusinessOwner: (email: string, password: string) => Promise<void>;
  signupAsBusinessOwner: (signUpData: any) => Promise<void>;
  loginAsAdmin: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // Check if this is a business owner by looking up their profile
          try {
            const businessProfile = await businessOwnerAuthService.getCurrentUser();
            if (businessProfile) {
              // This is a business owner
              setUser({
                uid: businessProfile.uid,
                email: businessProfile.email,
                role: businessProfile.role,
                firstName: businessProfile.firstName,
                lastName: businessProfile.lastName,
                phoneNumber: businessProfile.phoneNumber,
                businessName: businessProfile.businessName,
              });
              return;
            }
          } catch (businessError) {
            console.log('Not a business owner account');
          }

          // Check if this is an admin by looking up their profile
          try {
            const adminProfile = await adminAuthService.getCurrentUser();
            if (adminProfile) {
              // This is an admin
              setUser({
                uid: adminProfile.uid,
                email: adminProfile.email,
                role: adminProfile.role,
                firstName: adminProfile.firstName,
                lastName: adminProfile.lastName,
              });
              return;
            }
          } catch (adminError) {
            console.log('Not an admin account');
          }

          // Fallback for regular users (existing users without business/admin profiles)
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role: 'user',
          });
        } else {
          setUser(null);
        }
      });
      return unsubscribe;
    } catch (error) {
      console.warn('Auth initialization failed:', error);
      return () => {};
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const auth = getAuthInstance();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const auth = getAuthInstance();
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const loginAsBusinessOwner = async (email: string, password: string) => {
    try {
      await businessOwnerAuthService.signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signupAsBusinessOwner = async (signUpData: any) => {
    try {
      await businessOwnerAuthService.signUp(signUpData);
    } catch (error) {
      throw error;
    }
  };

  const loginAsAdmin = async (email: string, password: string) => {
    try {
      await adminAuthService.signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const auth = getAuthInstance();
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      login,
      signup,
      logout,
      loginAsBusinessOwner,
      signupAsBusinessOwner,
      loginAsAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
