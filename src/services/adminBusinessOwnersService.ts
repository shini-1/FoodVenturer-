import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_CONFIG, TABLES } from '../config/supabase';

interface BusinessOwnerRow {
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  business_name: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface BusinessOwnerAdminView {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  businessName?: string;
  isVerified: boolean;
  createdAt: string;
  emailConfirmed: boolean;
}

const serviceSupabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.serviceRoleKey
);

export async function getOwnerAdminView(uid: string): Promise<BusinessOwnerAdminView | null> {
  const { data: row, error } = await serviceSupabase
    .from(TABLES.BUSINESS_OWNERS)
    .select('*')
    .eq('uid', uid)
    .single();

  if (error || !row) {
    return null;
  }

  const { data: userData } = await serviceSupabase.auth.admin.getUserById(uid);
  const emailConfirmed = Boolean(userData?.user?.email_confirmed_at);

  return {
    uid: row.uid,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number ?? undefined,
    businessName: row.business_name ?? undefined,
    isVerified: row.is_verified,
    createdAt: row.created_at,
    emailConfirmed
  };
}

export async function listBusinessOwners(filter: 'all' | 'pending' = 'pending'): Promise<BusinessOwnerAdminView[]> {
  const query = serviceSupabase
    .from(TABLES.BUSINESS_OWNERS)
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 199);

  if (filter === 'pending') {
    query.eq('is_verified', false);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const views = await Promise.all(data.map((row) => getOwnerAdminView(row.uid)));
  return views.filter((v): v is BusinessOwnerAdminView => !!v);
}

export async function confirmOwnerEmail(uid: string): Promise<void> {
  const { error } = await serviceSupabase.auth.admin.updateUserById(uid, { email_confirm: true });
  if (error) {
    throw new Error(error.message ?? 'Failed to confirm email');
  }
}

export async function verifyOwner(uid: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.BUSINESS_OWNERS)
    .update({ is_verified: true })
    .eq('uid', uid);

  if (error) {
    throw new Error(error.message ?? 'Failed to verify owner');
  }
}

export async function confirmAndVerify(uid: string): Promise<void> {
  await confirmOwnerEmail(uid);
  await verifyOwner(uid);
}
