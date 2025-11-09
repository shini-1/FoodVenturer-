import { supabase } from '../../services/firebase';
import { TABLES } from '../config/supabase';

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
  private readonly BUSINESS_OWNERS_TABLE = TABLES.BUSINESS_OWNERS;

  /**
   * Sign up a new business owner
   */
  async signUp(signUpData: SignUpData): Promise<BusinessOwnerProfile> {
    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      const uid = authData.user.id;

      // Create business owner profile in database
      const profile: Omit<BusinessOwnerProfile, 'uid'> = {
        email: signUpData.email,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        phoneNumber: signUpData.phoneNumber,
        businessName: signUpData.businessName,
        role: 'business_owner',
        createdAt: new Date(),
        isVerified: false,
      };

      const profileData = {
        uid,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone_number: profile.phoneNumber,
        business_name: profile.businessName,
        role: profile.role,
        created_at: profile.createdAt.toISOString(),
        is_verified: profile.isVerified,
      };

      const { error: insertError } = await supabase
        .from(this.BUSINESS_OWNERS_TABLE)
        .insert(profileData);

      if (insertError) {
        // Clean up auth user if profile creation failed
        await supabase.auth.admin.deleteUser(uid);
        throw insertError;
      }

      return { uid, ...profile };
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Sign in existing business owner
   */
  async signIn(email: string, password: string): Promise<BusinessOwnerProfile> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Authentication failed');
      }

      // Get profile from database
      const profile = await this.getProfile(data.user.id);

      if (!profile) {
        throw new Error('Business owner profile not found');
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<BusinessOwnerProfile | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) return null;

      return await this.getProfile(user.id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(uid: string, updates: Partial<BusinessOwnerProfile>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.firstName) updateData.first_name = updates.firstName;
      if (updates.lastName) updateData.last_name = updates.lastName;
      if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
      if (updates.businessName !== undefined) updateData.business_name = updates.businessName;
      if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified;

      const { error } = await supabase
        .from(this.BUSINESS_OWNERS_TABLE)
        .update(updateData)
        .eq('uid', uid);

      if (error) throw error;
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Check if email is already registered
   */
  async isEmailRegistered(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.BUSINESS_OWNERS_TABLE)
        .select('email')
        .eq('email', email)
        .limit(1);

      if (error) return false;

      return data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private methods
   */
  private async getProfile(uid: string): Promise<BusinessOwnerProfile | null> {
    try {
      const { data, error } = await supabase
        .from(this.BUSINESS_OWNERS_TABLE)
        .select('*')
        .eq('uid', uid)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        uid: data.uid,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        phoneNumber: data.phone_number,
        businessName: data.business_name,
        role: data.role,
        createdAt: new Date(data.created_at),
        isVerified: data.is_verified || false,
      } as BusinessOwnerProfile;
    } catch (error) {
      return null;
    }
  }

  private getErrorMessage(error: any): string {
    // Map Supabase auth errors to user-friendly messages
    if (error.message?.includes('already registered')) {
      return 'This email is already registered';
    }
    if (error.message?.includes('Password should be')) {
      return 'Password should be at least 6 characters';
    }
    if (error.message?.includes('Invalid email')) {
      return 'Please enter a valid email address';
    }
    if (error.message?.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (error.message?.includes('Email not confirmed')) {
      return 'Please check your email and confirm your account';
    }

    return error.message || 'An error occurred';
  }
}

export const businessOwnerAuthService = new BusinessOwnerAuthService();
