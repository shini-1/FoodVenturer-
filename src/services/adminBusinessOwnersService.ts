import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, TABLES, supabase, USE_EDGE_FUNCTIONS } from '../config/supabase';

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

const serviceSupabase = SUPABASE_CONFIG.serviceRoleKey
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey)
  : null;

export async function getOwnerAdminView(uid: string): Promise<BusinessOwnerAdminView | null> {
  if (!serviceSupabase) return null;
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
  if (!serviceSupabase) return [];
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

export async function listOwnersFromAuth(filter: 'all' | 'pending' = 'all'): Promise<BusinessOwnerAdminView[]> {
  if (USE_EDGE_FUNCTIONS || !SUPABASE_CONFIG.serviceRoleKey) {
    const { data, error } = await supabase.functions.invoke('admin-list-owners', {
      body: { filter }
    });
    if (error) return [];
    const views = (data || []) as BusinessOwnerAdminView[];
    return filter === 'pending' ? views.filter(v => !v.isVerified) : views;
  }

  if (!serviceSupabase) return [];
  const { data: { users } = { users: [] } } = await serviceSupabase.auth.admin.listUsers({ page: 1, perPage: 200 } as any);
  const authUsers = (users || []).filter(u => !!u.email);

  const { data: admins } = await serviceSupabase
    .from(TABLES.ADMINS)
    .select('uid')
    .range(0, 499);
  const adminSet = new Set((admins || []).map(a => a.uid));

  const uids = authUsers.map(u => u.id);
  const { data: ownerRows } = await serviceSupabase
    .from(TABLES.BUSINESS_OWNERS)
    .select('*')
    .in('uid', uids.length ? uids : ['__none__'])
    .range(0, 499);
  const ownerMap = new Map((ownerRows || []).map((r: any) => [r.uid, r]));

  const views: BusinessOwnerAdminView[] = authUsers
    .filter(u => !adminSet.has(u.id))
    .map(u => {
      const row = ownerMap.get(u.id);
      const emailConfirmed = Boolean((u as any).email_confirmed_at);
      return {
        uid: u.id,
        email: u.email!,
        firstName: row?.first_name ?? '',
        lastName: row?.last_name ?? '',
        phoneNumber: row?.phone_number ?? undefined,
        businessName: row?.business_name ?? undefined,
        isVerified: Boolean(row?.is_verified),
        createdAt: (row?.created_at ?? u.created_at) as string,
        emailConfirmed,
      } as BusinessOwnerAdminView;
    });

  views.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return filter === 'pending' ? views.filter(v => !v.isVerified) : views;
}

export async function confirmOwnerEmail(uid: string): Promise<void> {
  if (USE_EDGE_FUNCTIONS || !SUPABASE_CONFIG.serviceRoleKey || !serviceSupabase) {
    const { error } = await supabase.functions.invoke('admin-confirm-owner', { body: { uid } });
    if (error) throw new Error(error.message ?? 'Failed to confirm email');
    return;
  }
  const { error } = await serviceSupabase.auth.admin.updateUserById(uid, { email_confirm: true });
  if (error) throw new Error(error.message ?? 'Failed to confirm email');
}

export async function verifyOwner(uid: string): Promise<void> {
  if (USE_EDGE_FUNCTIONS || !SUPABASE_CONFIG.serviceRoleKey || !serviceSupabase) {
    const { error } = await supabase.functions.invoke('admin-verify-owner', { body: { uid } });
    if (error) throw new Error(error.message ?? 'Failed to verify owner');
    return;
  }

  const { data, error } = await serviceSupabase
    .from(TABLES.BUSINESS_OWNERS)
    .update({ is_verified: true })
    .eq('uid', uid)
    .select('uid');

  if (error) throw new Error(error.message ?? 'Failed to verify owner');

  if (!data || data.length === 0) {
    const { data: userData } = await serviceSupabase.auth.admin.getUserById(uid);
    const email = userData?.user?.email ?? '';
    const { error: insertError } = await serviceSupabase
      .from(TABLES.BUSINESS_OWNERS)
      .insert({
        uid,
        email,
        first_name: '',
        last_name: '',
        phone_number: null,
        business_name: null,
        role: 'business_owner',
        created_at: new Date().toISOString(),
        is_verified: true,
      });
    if (insertError) throw new Error(insertError.message ?? 'Failed to create owner row while verifying');
  }
}

export async function confirmAndVerify(uid: string): Promise<void> {
  await confirmOwnerEmail(uid);
  await verifyOwner(uid);
}
