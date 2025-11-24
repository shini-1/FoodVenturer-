import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dvkpflctotjavgrvbgay.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0'
};

export const TABLES = {
  RESTAURANTS: 'restaurants',
  PENDING_RESTAURANTS: 'pending_restaurants',
  RESTAURANT_OWNERS: 'restaurant_owners',
  RESTAURANT_SUBMISSIONS: 'restaurant_submissions',
  BUSINESS_OWNERS: 'business_owners',
  ADMINS: 'admins',
  MENU_ITEMS: 'menu_items',
};

export const BUCKETS = {
  RESTAURANT_IMAGES: 'restaurant-images',
};

export const supabase: SupabaseClient = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);
