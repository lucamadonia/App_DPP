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
  const invitationUrl = `${window.location.origin}/suppliers/register/${invitation.invitationCode}`;

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
 * Returns invitation + tenant info + branding
 */
export async function getSupplierInvitationByCode(
  invitationCode: string
): Promise<PublicSupplierInvitationResult> {
  // Query invitation with tenant info (no auth required due to RLS policy)
  const { data: invitationData, error: invitationError } = await supabase
    .from('supplier_invitations')
    .select(`
      *,
      tenants:tenant_id (
        id,
        name,
        slug,
        settings
      )
    `)
    .eq('invitation_code', invitationCode)
    .single();

  if (invitationError || !invitationData) {
    throw new Error('Invitation not found');
  }

  const invitation = transformInvitation(invitationData);
  const tenant = invitationData.tenants as any;

  // Check if invitation is expired
  const now = new Date();
  const expiresAt = new Date(invitation.expiresAt);
  if (invitation.status === 'pending' && expiresAt < now) {
    // Mark as expired
    await supabase
      .from('supplier_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id);

    invitation.status = 'expired';
  }

  // Validate invitation status
  if (invitation.status !== 'pending') {
    throw new Error(`Invitation is ${invitation.status}`);
  }

  // Extract portal settings
  const portalSettings: SupplierPortalSettings = {
    ...(typeof DEFAULT_SUPPLIER_PORTAL_SETTINGS === 'object' ? DEFAULT_SUPPLIER_PORTAL_SETTINGS : {}),
    ...(tenant.settings?.supplierPortal || {}),
  } as SupplierPortalSettings;

  // Extract branding
  const branding = {
    logoUrl: tenant.settings?.branding?.logo,
    primaryColor: tenant.settings?.branding?.primaryColor,
  };

  return {
    invitation,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
    portalSettings,
    branding,
  };
}

/**
 * PUBLIC: Submit supplier registration (no auth required)
 * Creates supplier with status 'pending_approval' and marks invitation as completed
 */
export async function publicSubmitSupplierRegistration(
  invitationCode: string,
  data: SupplierRegistrationData
): Promise<{ success: boolean; supplierId: string }> {
  // Validate invitation first
  const invitationResult = await getSupplierInvitationByCode(invitationCode);
  const { invitation, tenant } = invitationResult;

  // Validate required fields
  const requiredFields = [
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
    if (!data[field as keyof SupplierRegistrationData]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate terms acceptance
  if (!data.termsAccepted) {
    throw new Error('Terms must be accepted');
  }

  // Build shipping address if different
  let shippingAddress = undefined;
  if (data.shippingAddressDifferent) {
    shippingAddress = {
      street: data.shippingStreet || '',
      addressLine2: data.shippingAddressLine2,
      city: data.shippingCity || '',
      state: data.shippingState,
      country: data.shippingCountry || '',
      postalCode: data.shippingPostalCode || '',
    };
  }

  // Create supplier record with status 'pending_approval'
  const supplierData = {
    tenant_id: tenant.id,
    name: data.companyName.trim(),
    status: 'pending_approval' as const,
    verified: false,

    // Contact info
    contact_name: data.contactName.trim(),
    contact_position: data.contactPosition?.trim(),
    email: data.email.trim(),
    phone: data.phone?.trim(),
    mobile: data.mobile?.trim(),
    website: data.website?.trim(),
    linkedin: data.linkedin?.trim(),

    // Address
    address: {
      street: data.street.trim(),
      addressLine2: data.addressLine2?.trim(),
      city: data.city.trim(),
      state: data.state?.trim(),
      country: data.country,
      postalCode: data.postalCode.trim(),
    },

    // Shipping address (if different)
    shipping_address: shippingAddress,

    // Legal info
    legal_form: data.legalForm?.trim(),
    tax_number: data.taxNumber.trim(),
    vat_number: data.vatNumber.trim(),
    commercial_register_number: data.commercialRegisterNumber?.trim(),

    // Banking
    bank_name: data.bankName?.trim(),
    iban: data.iban.trim().replace(/\s/g, ''), // Remove spaces
    bic: data.bic.trim().replace(/\s/g, ''), // Remove spaces
    payment_terms: data.paymentTerms?.trim(),

    // Business details
    supplier_type: data.supplierType,
    industry: data.industry?.trim(),
    product_categories: data.productCategories?.trim(),
    certifications: data.certifications?.trim(),
    internal_notes: data.notes?.trim(),
  };

  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .insert(supplierData)
    .select()
    .single();

  if (supplierError) throw supplierError;

  // Mark invitation as completed
  const { error: updateError } = await supabase
    .from('supplier_invitations')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      supplier_id: supplier.id,
    })
    .eq('id', invitation.id);

  if (updateError) throw updateError;

  return { success: true, supplierId: supplier.id };
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
