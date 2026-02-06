/**
 * Supabase Profiles Service
 *
 * CRUD-Operationen für Benutzerprofile mit RLS (Row Level Security)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

export interface Profile {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string | null;
  invitedBy: string | null;
  invitedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Transform database row to Profile type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProfile(row: any): Profile {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    name: row.name || null,
    avatarUrl: row.avatar_url || null,
    role: row.role || 'viewer',
    status: row.status || 'active',
    lastLogin: row.last_login || null,
    invitedBy: row.invited_by || null,
    invitedAt: row.invited_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get a profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to load profile:', error);
    return null;
  }

  return transformProfile(data);
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('No user logged in - cannot load profile');
    return null;
  }

  return getProfile(user.id);
}

/**
 * Get all profiles in the current tenant
 */
export async function getProfiles(): Promise<Profile[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    console.warn('No tenant set - cannot load profiles');
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load profiles:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformProfile(row));
}

/**
 * Update a profile
 */
export async function updateProfile(
  userId: string,
  data: Partial<Pick<Profile, 'name' | 'avatarUrl' | 'role'>>
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name || null;
  if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl || null;
  if (data.role !== undefined) updateData.role = data.role;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Failed to update profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update the current user's profile
 */
export async function updateCurrentProfile(
  data: Partial<Pick<Profile, 'name' | 'avatarUrl'>>
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No user logged in' };
  }

  return updateProfile(user.id, data);
}

/**
 * Invite a new user to the tenant
 * Note: This creates the profile entry, the actual invite is handled by Supabase Auth
 */
export async function inviteUser(
  email: string,
  role: 'admin' | 'editor' | 'viewer' = 'viewer'
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // Billing quota check
  const { checkQuota } = await import('./billing');
  const quota = await checkQuota('admin_user', { tenantId });
  if (!quota.allowed) {
    return { success: false, error: `Admin user limit reached (${quota.current}/${quota.limit}). Please upgrade your plan.` };
  }

  // Use Supabase Auth to invite the user
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: {
      tenant_id: tenantId,
      role: role,
    },
  });

  if (inviteError) {
    // If admin API is not available, try regular invite
    console.warn('Admin invite failed, user may need to sign up manually:', inviteError);
    return { success: false, error: 'Einladungsfunktion nicht verfügbar. Benutzer muss sich selbst registrieren.' };
  }

  return { success: true };
}

/**
 * Update a user's role with last-admin protection
 */
export async function updateProfileRole(
  userId: string,
  role: 'admin' | 'editor' | 'viewer'
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Last admin protection
  if (role !== 'admin') {
    const adminCount = await getAdminCount();
    const currentProfile = await getProfile(userId);
    if (currentProfile?.role === 'admin' && adminCount <= 1) {
      return { success: false, error: 'Cannot change the role of the last admin.' };
    }
  }

  return updateProfile(userId, { role });
}

/**
 * Deactivate a user
 */
export async function deactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Last admin protection
  const profile = await getProfile(userId);
  if (profile?.role === 'admin') {
    const adminCount = await getAdminCount();
    if (adminCount <= 1) {
      return { success: false, error: 'Cannot deactivate the last admin.' };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Reactivate a user
 */
export async function reactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get count of active admins in the current tenant
 */
export async function getAdminCount(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return 0;

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')
    .neq('status', 'inactive');

  return count || 0;
}

/**
 * Remove a user from the tenant (does not delete the auth user)
 */
export async function removeUserFromTenant(userId: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // Check if we're trying to remove ourselves
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId) {
    return { success: false, error: 'Sie können sich nicht selbst entfernen' };
  }

  // For now, we just update the profile to remove tenant access
  // In a real system, you might want to delete the profile or move to a different tenant
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Failed to remove user from tenant:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
