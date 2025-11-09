import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../src/config/supabase';

// Create Supabase client
export const supabase: SupabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// Legacy Firebase functions for backward compatibility
export const initializeFirebase = (): void => {
  console.log('✅ Supabase client initialized');
  console.log('📍 URL:', SUPABASE_CONFIG.url);
  console.log('🔑 Key configured:', !!SUPABASE_CONFIG.anonKey);
};

export const testFirebaseConnectivity = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Supabase connectivity...');

    // Test basic connectivity
    const { data, error } = await supabase.from('test').select('*').limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected
      console.error('🧪 Supabase test failed:', error);
      return false;
    }

    console.log('🧪 Supabase connection successful');
    return true;
  } catch (error) {
    console.error('🧪 Supabase connectivity test failed:', error);
    return false;
  }
};

// Legacy exports for compatibility
export const getAuthInstance = () => supabase.auth;
export const getFirestoreInstance = () => supabase;
export const getStorageInstance = () => supabase.storage;

// Export Supabase client
export { supabase as app, supabase as firestore, supabase as auth, supabase as storage };
