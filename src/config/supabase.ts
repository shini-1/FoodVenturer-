// Supabase configuration
// Replace these values with your actual Supabase project credentials
export const SUPABASE_CONFIG = {
  url: 'https://dvkpflctotjavgrvbgay.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q',
  // Add your service role key for admin operations (keep secret!)
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ5NjAxNCwiZXhwIjoyMDc4MDcyMDE0fQ.J6dm0Lm11pNVMvwLkwf94VKaWqymsP1SdpA8-g7khH0',
};

// Database table names (equivalent to Firestore collections)
export const TABLES = {
  ADMINS: 'admins',
  BUSINESS_OWNERS: 'business_owners',
  RESTAURANTS: 'restaurants',
  RESTAURANT_SUBMISSIONS: 'restaurant_submissions',
  REVIEWS: 'reviews',
  USERS: 'users',
};

// Storage bucket names
export const BUCKETS = {
  RESTAURANT_IMAGES: 'restaurant-images',
  USER_AVATARS: 'user-avatars',
};

// Temporary fix: Disable RLS for business_owners table during registration
export const TEMP_DISABLE_RLS_SQL = `
-- Temporarily disable RLS to allow registration
ALTER TABLE business_owners DISABLE ROW LEVEL SECURITY;

-- Add the missing is_verified column
ALTER TABLE business_owners 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
`;

// SQL to confirm admin email and set up Row Level Security
export const CONFIRM_ADMIN_EMAIL_SQL = `
-- Confirm the admin email
UPDATE auth.users
SET
  email_confirmed_at = NOW()
WHERE email = 'admin@foodventurer.com';

-- Verify the email was confirmed
SELECT
  email,
  email_confirmed_at
FROM auth.users
WHERE email = 'admin@foodventurer.com';

-- Create restaurant_submissions table
CREATE TABLE IF NOT EXISTS restaurant_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location JSONB NOT NULL,
  image TEXT,
  description TEXT,
  cuisine_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rejection_reason TEXT
);

-- Create business_owners table
CREATE TABLE IF NOT EXISTS business_owners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  business_name TEXT,
  role TEXT DEFAULT 'business_owner',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE
);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location JSONB,
  image TEXT,
  category TEXT,
  rating DECIMAL(2,1),
  price_range TEXT,
  description TEXT,
  phone TEXT,
  hours TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for restaurant_submissions table
ALTER TABLE restaurant_submissions ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security for business_owners table
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create submissions" ON restaurant_submissions;
DROP POLICY IF EXISTS "Admins can read all submissions" ON restaurant_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON restaurant_submissions;

-- Allow authenticated users to create submissions
CREATE POLICY "Users can create submissions" ON restaurant_submissions
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Allow admins to read all submissions
CREATE POLICY "Admins can read all submissions" ON restaurant_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
      AND admins.is_active = true
    )
  );

-- Allow admins to update submissions
CREATE POLICY "Admins can update submissions" ON restaurant_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
      AND admins.is_active = true
    )
  );

-- Drop existing policies if they exist (business_owners table)
DROP POLICY IF EXISTS "Business owners can read own profile" ON business_owners;
DROP POLICY IF EXISTS "Business owners can update own profile" ON business_owners;
DROP POLICY IF EXISTS "Admins can manage business owners" ON business_owners;
DROP POLICY IF EXISTS "Users can create business owner profile" ON business_owners;

-- Allow authenticated users to create business owner profiles (during registration)
CREATE POLICY "Users can create business owner profile" ON business_owners
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow business owners to read their own profile
CREATE POLICY "Business owners can read own profile" ON business_owners
  FOR SELECT USING (auth.uid() = uid);

-- Allow business owners to update their own profile
CREATE POLICY "Business owners can update own profile" ON business_owners
  FOR UPDATE USING (auth.uid() = uid);

-- Allow admins to manage all business owners
CREATE POLICY "Admins can manage business owners" ON business_owners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
      AND admins.is_active = true
    )
  );

-- Enable Row Level Security for restaurants table
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (restaurants table)
DROP POLICY IF EXISTS "Anyone can read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admins can manage restaurants" ON restaurants;

-- Allow anyone to read restaurants (public data)
CREATE POLICY "Anyone can read restaurants" ON restaurants
  FOR SELECT USING (true);

-- Allow admins to insert/update/delete restaurants
CREATE POLICY "Admins can manage restaurants" ON restaurants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
      AND admins.is_active = true
    )
  );

-- Enable Row Level Security for admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read their own profile" ON admins;
DROP POLICY IF EXISTS "Allow admin creation" ON admins;
DROP POLICY IF EXISTS "Admins can update their own profile" ON admins;
DROP POLICY IF EXISTS "Admins can delete their own profile" ON admins;

-- Allow reading own profile
CREATE POLICY "Admins can read their own profile" ON admins
  FOR SELECT USING (auth.uid() = uid);

-- Allow inserting new admins (for initial setup - you may want to restrict this)
CREATE POLICY "Allow admin creation" ON admins
  FOR INSERT WITH CHECK (true);

-- Allow updating own profile
CREATE POLICY "Admins can update their own profile" ON admins
  FOR UPDATE USING (auth.uid() = uid);

-- Allow deleting own profile (optional)
CREATE POLICY "Admins can delete their own profile" ON admins
  FOR DELETE USING (auth.uid() = uid);
`;
