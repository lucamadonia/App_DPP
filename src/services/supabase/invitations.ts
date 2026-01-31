/**
 * Supabase Invitations Service
 *
 * CRUD for tenant user invitations
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Invitation } from '@/types/database';

type WriteResult = { success: boolean; error?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformInvitation(row: any): Invitation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role || 'viewer',
    name: row.name || undefined,
    message: row.message || undefined,
    status: row.status || 'pending',
    invitedBy: row.invited_by || undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function getInvitations(): Promise<Invitation[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load invitations:', error);
    return [];
  }

  return (data || []).map(transformInvitation);
}

export async function createInvitation(invitation: {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  name?: string;
  message?: string;
}): Promise<WriteResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('invitations').insert({
    tenant_id: tenantId,
    email: invitation.email,
    role: invitation.role,
    name: invitation.name || null,
    message: invitation.message || null,
    invited_by: user?.id || null,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'An invitation for this email already exists.' };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cancelInvitation(id: string): Promise<WriteResult> {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resendInvitation(id: string): Promise<WriteResult> {
  const { error } = await supabase
    .from('invitations')
    .update({
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteInvitation(id: string): Promise<WriteResult> {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
