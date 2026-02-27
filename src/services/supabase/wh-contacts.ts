/**
 * Warehouse Contacts Service
 * CRUD for wh_contacts (B2B recipients) + combined recipient search
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhContact, WhContactInput } from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformContact(row: any): WhContact {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    companyName: row.company_name || undefined,
    contactName: row.contact_name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    street: row.street || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    postalCode: row.postal_code || undefined,
    country: row.country || undefined,
    customerNumber: row.customer_number || undefined,
    vatId: row.vat_id || undefined,
    notes: row.notes || undefined,
    tags: row.tags || [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getContacts(filters?: { search?: string; activeOnly?: boolean }): Promise<WhContact[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_contacts')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  if (filters?.search) {
    query = query.or(
      `contact_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,customer_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query.order('contact_name');

  if (error) {
    console.error('Failed to load contacts:', error);
    return [];
  }
  return (data || []).map(transformContact);
}

export async function getContact(id: string): Promise<WhContact | null> {
  const { data, error } = await supabase
    .from('wh_contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformContact(data);
}

export async function createContact(input: WhContactInput): Promise<WhContact> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data, error } = await supabase
    .from('wh_contacts')
    .insert({
      tenant_id: tenantId,
      type: input.type || 'b2b',
      company_name: input.companyName || null,
      contact_name: input.contactName,
      email: input.email || null,
      phone: input.phone || null,
      street: input.street || null,
      city: input.city || null,
      state: input.state || null,
      postal_code: input.postalCode || null,
      country: input.country || null,
      customer_number: input.customerNumber || null,
      vat_id: input.vatId || null,
      notes: input.notes || null,
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return transformContact(data);
}

export async function updateContact(id: string, input: Partial<WhContactInput>): Promise<WhContact> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (input.type !== undefined) update.type = input.type;
  if (input.companyName !== undefined) update.company_name = input.companyName || null;
  if (input.contactName !== undefined) update.contact_name = input.contactName;
  if (input.email !== undefined) update.email = input.email || null;
  if (input.phone !== undefined) update.phone = input.phone || null;
  if (input.street !== undefined) update.street = input.street || null;
  if (input.city !== undefined) update.city = input.city || null;
  if (input.state !== undefined) update.state = input.state || null;
  if (input.postalCode !== undefined) update.postal_code = input.postalCode || null;
  if (input.country !== undefined) update.country = input.country || null;
  if (input.customerNumber !== undefined) update.customer_number = input.customerNumber || null;
  if (input.vatId !== undefined) update.vat_id = input.vatId || null;
  if (input.notes !== undefined) update.notes = input.notes || null;
  if (input.tags !== undefined) update.tags = input.tags;

  const { data, error } = await supabase
    .from('wh_contacts')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update contact: ${error.message}`);
  return transformContact(data);
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('wh_contacts')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
}

/**
 * Combined recipient search: searches both wh_contacts (B2B) and rh_customers (B2C).
 * Returns a unified list with type badges for the shipment wizard.
 */
export interface RecipientSearchResult {
  id: string;
  type: 'b2b' | 'customer';
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export async function searchRecipients(query: string): Promise<RecipientSearchResult[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId || !query || query.length < 2) return [];

  const results: RecipientSearchResult[] = [];

  // Search B2B contacts
  const { data: contacts } = await supabase
    .from('wh_contacts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .or(`contact_name.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (contacts) {
    for (const c of contacts) {
      results.push({
        id: c.id,
        type: 'b2b',
        name: c.contact_name,
        company: c.company_name || undefined,
        email: c.email || undefined,
        phone: c.phone || undefined,
        street: c.street || undefined,
        city: c.city || undefined,
        postalCode: c.postal_code || undefined,
        country: c.country || undefined,
      });
    }
  }

  // Search B2C customers (from Returns Hub)
  const { data: customers } = await supabase
    .from('rh_customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (customers) {
    for (const c of customers) {
      const addr = c.addresses?.[0];
      results.push({
        id: c.id,
        type: 'customer',
        name: c.name,
        email: c.email || undefined,
        phone: c.phone || undefined,
        street: addr?.street || undefined,
        city: addr?.city || undefined,
        postalCode: addr?.postal_code || addr?.postalCode || undefined,
        country: addr?.country || undefined,
      });
    }
  }

  return results;
}
