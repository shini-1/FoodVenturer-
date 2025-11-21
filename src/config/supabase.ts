// Supabase configuration
// Replace these values with your actual Supabase project credentials
export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dvkpflctotjavgrvbgay.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2a3BmbGN0b3RqYXZncnZiZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0OTYwMTQsImV4cCI6MjA3ODA3MjAxNH0.MZ15GS6Ftz3mR8mKu8fhcP6fh6YWY8f_6GMy1ZVGx_Q',
  // Add your service role key for admin operations (keep secret!)
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};

// Database table names (equivalent to Firestore collections)
export const TABLES = {
  ADMINS: 'admins',
  BUSINESS_OWNERS: 'business_owners',
  CATEGORIES: 'categories',
  RESTAURANTS: 'restaurants',
  RESTAURANT_SUBMISSIONS: 'restaurant_submissions',
  MENU_ITEMS: 'menu_items',
  PROMOS: 'promos',
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

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT, -- e.g., 'appetizers', 'main course', 'desserts', 'beverages'
  image TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add owner_id to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create promos table
CREATE TABLE IF NOT EXISTS promos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount DECIMAL(5,2) NOT NULL CHECK (discount > 0 AND discount <= 100),
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for restaurant_submissions table
ALTER TABLE restaurant_submissions ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security for business_owners table
ALTER TABLE business_owners ENABLE ROW LEVEL SECURITY;

-- Enable RLS for promos table
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security for menu_items table
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

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

-- Drop existing policies if they exist (menu_items table)
DROP POLICY IF EXISTS "Anyone can read menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins can manage menu items" ON menu_items;

-- Allow anyone to read menu items (public data)
CREATE POLICY "Anyone can read menu items" ON menu_items
  FOR SELECT USING (true);

-- Allow admins to manage menu items
CREATE POLICY "Admins can manage menu items" ON menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.uid = auth.uid()
      AND admins.is_active = true
    )
  );

-- Allow business owners to manage their own promos
CREATE POLICY "Business owners can manage own promos" ON promos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = promos.restaurant_id
      AND r.owner_id = auth.uid()
    )
  );

-- Allow anyone to read active promos (for restaurant details)
CREATE POLICY "Anyone can read active promos" ON promos
  FOR SELECT USING (expiry_date >= CURRENT_DATE);

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
