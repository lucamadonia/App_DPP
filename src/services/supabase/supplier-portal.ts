/**
 * Supplier Portal Service
 * Handles invitation-based supplier self-registration
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  SupplierInvitation,
  SupplierRegistrationData,
  PublicSupplierInvitationResult,
  SupplierPortalSettings,
} from '@/types/supplier-portal';
import { DEFAULT_SUPPLIER_PORTAL_SETTINGS } from '@/types/supplier-portal';
import { getPublicBaseUrl } from '@/lib/platform';

// Transform database row to SupplierInvitation
function transformInvitation(row: any): SupplierInvitation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    contactName: row.contact_name,
    companyName: row.company_name,
    invitationCode: row.invitation_code,
    status: row.status,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    supplierId: row.supplier_id,
  };
}

/**
 * Get all supplier invitations for current tenant
 */
export async function getSupplierInvitations(): Promise<SupplierInvitation[]> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('supplier_invitations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ? data.map(transformInvitation) : [];
}

/**
 * Create a new supplier invitation
 * Returns the invitation object with the generated link
 */
export async function createSupplierInvitation(params: {
  email: string;
  contactName?: string;
  companyName?: string;
}): Promise<{
  invitation: SupplierInvitation;
  invitationUrl: string;
}> {
  const tenantId = await getCurrentTenantId();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Billing: check supplier portal module
  const { hasModule: checkModule } = await import('./billing');
  const hasSupplierPortal = await checkModule('supplier_portal', tenantId || undefined);
  if (!hasSupplierPortal) {
    throw new Error('Supplier Portal module not active. Please activate it in Billing settings.');
  }

  // Get tenant settings for expiry days
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const expiryDays = tenantData?.settings?.supplierPortal?.invitationExpiryDays || 14;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { data, error } = await supabase
    .from('supplier_invitations')
    .insert({
      tenant_id: tenantId,
      email: params.email,
      contact_name: params.contactName,
      company_name: params.companyName,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  const invitation = transformInvitation(data);
  const invitationUrl = `${getPublicBaseUrl()}/suppliers/register/${invitation.invitationCode}`;

  return { invitation, invitationUrl };
}

/**
 * Cancel a supplier invitation
 */
export async function cancelSupplierInvitation(invitationId: string): Promise<void> {
  const tenantId = await getCurrentTenantId();

  const { error } = await supabase
    .from('supplier_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending'); // Can only cancel pending invitations

  if (error) throw error;
}

/**
 * PUBLIC: Get supplier invitation by code (no auth required)
 * Returns invitation + tenant info + branding.
 * Uses the SECURITY DEFINER RPC get_supplier_invitation_by_code, which only
 * returns the single matching invitation (no table-wide anon SELECT) and
 * marks it expired server-side when needed.
 */
export async function getSupplierInvitationByCode(
  invitationCode: string
): Promise<PublicSupplierInvitationResult> {
  const { data, error } = await supabase.rpc('get_supplier_invitation_by_code', {
    p_code: invitationCode,
  });

  if (error || !data) {
    throw new Error('Invitation not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any;
  const invitation = transformInvitation(result.invitation);

  // Validate invitation status
  if (invitation.status !== 'pending') {
    throw new Error(`Invitation is ${invitation.status}`);
  }

  // Extract portal settings
  const portalSettings: SupplierPortalSettings = {
    ...DEFAULT_SUPPLIER_PORTAL_SETTINGS,
    ...(result.portalSettings || {}),
  };

  return {
    invitation,
    tenant: {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
    },
    portalSettings,
    branding: {
      logoUrl: result.branding?.logoUrl ?? undefined,
      primaryColor: result.branding?.primaryColor ?? undefined,
    },
  };
}

/**
 * PUBLIC: Submit supplier registration (no auth required)
 * Creates supplier with status 'pending_approval' and marks invitation as completed.
 * Validation and the insert run server-side in the SECURITY DEFINER RPC
 * submit_supplier_registration (invitation code checked under row lock).
 */
export async function publicSubmitSupplierRegistration(
  invitationCode: string,
  data: SupplierRegistrationData
): Promise<{ success: boolean; supplierId: string }> {
  // Client-side pre-validation for fast feedback (server re-validates)
  const requiredFields: Array<keyof SupplierRegistrationData> = [
    'companyName',
    'contactName',
    'email',
    'street',
    'city',
    'country',
    'postalCode',
    'taxNumber',
    'vatNumber',
    'iban',
    'bic',
  ];

  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (!data.termsAccepted) {
    throw new Error('Terms must be accepted');
  }

  const { data: supplierId, error } = await supabase.rpc('submit_supplier_registration', {
    p_code: invitationCode,
    p_data: data,
  });

  if (error) throw new Error(error.message || 'Registration failed');
  if (typeof supplierId !== 'string') throw new Error('Registration failed');

  return { success: true, supplierId };
}

/**
 * Approve a pending supplier
 * Sets status to 'active' and verified to true
 */
export async function approveSupplier(supplierId: string): Promise<void> {
  const tenantId = await getCurrentTenantId();

  const { error } = await supabase
    .from('suppliers')
    .update({
      status: 'active',
      verified: true,
    })
    .eq('id', supplierId)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending_approval');

  if (error) throw error;
}

/**
 * Reject a pending supplier
 * Sets status to 'blocked' and adds rejection reason to internal notes
 */
export async function rejectSupplier(
  supplierId: string,
  reason?: string
): Promise<void> {
  const tenantId = await getCurrentTenantId();

  // Get current internal notes
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('internal_notes')
    .eq('id', supplierId)
    .eq('tenant_id', tenantId)
    .single();

  const rejectionNote = reason
    ? `REJECTED: ${reason}`
    : 'REJECTED by admin';

  const updatedNotes = supplier?.internal_notes
    ? `${supplier.internal_notes}\n\n${rejectionNote}`
    : rejectionNote;

  const { error } = await supabase
    .from('suppliers')
    .update({
      status: 'blocked',
      internal_notes: updatedNotes,
    })
    .eq('id', supplierId)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending_approval');

  if (error) throw error;
}
