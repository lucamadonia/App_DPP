/**
 * Warehouse Contacts Service
 * CRUD for wh_contacts (B2B recipients) + combined recipient search
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhContact, WhContactInput, WhContactType, ContactStats, WhShipment } from '@/types/warehouse';

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
    // Influencer fields
    instagramHandle: row.instagram_handle || undefined,
    tiktokHandle: row.tiktok_handle || undefined,
    youtubeHandle: row.youtube_handle || undefined,
    otherSocialUrl: row.other_social_url || undefined,
    primaryPlatform: row.primary_platform || undefined,
    followerCount: row.follower_count != null ? Number(row.follower_count) : undefined,
    engagementRate: row.engagement_rate != null ? Number(row.engagement_rate) : undefined,
    niche: row.niche || undefined,
    influencerTier: row.influencer_tier || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getContacts(filters?: { search?: string; activeOnly?: boolean; type?: WhContactType }): Promise<WhContact[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_contacts')
    .select('*')
    .eq('tenant_id', tenantId);

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  if (filters?.type) {
    query = query.eq('type', filters.type);
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
      // Influencer fields
      instagram_handle: input.instagramHandle || null,
      tiktok_handle: input.tiktokHandle || null,
      youtube_handle: input.youtubeHandle || null,
      other_social_url: input.otherSocialUrl || null,
      primary_platform: input.primaryPlatform || null,
      follower_count: input.followerCount || null,
      engagement_rate: input.engagementRate || null,
      niche: input.niche || null,
      influencer_tier: input.influencerTier || null,
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
  // Influencer fields
  if (input.instagramHandle !== undefined) update.instagram_handle = input.instagramHandle || null;
  if (input.tiktokHandle !== undefined) update.tiktok_handle = input.tiktokHandle || null;
  if (input.youtubeHandle !== undefined) update.youtube_handle = input.youtubeHandle || null;
  if (input.otherSocialUrl !== undefined) update.other_social_url = input.otherSocialUrl || null;
  if (input.primaryPlatform !== undefined) update.primary_platform = input.primaryPlatform || null;
  if (input.followerCount !== undefined) update.follower_count = input.followerCount || null;
  if (input.engagementRate !== undefined) update.engagement_rate = input.engagementRate || null;
  if (input.niche !== undefined) update.niche = input.niche || null;
  if (input.influencerTier !== undefined) update.influencer_tier = input.influencerTier || null;

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
 * Pulls the most recent shipping address from wh_shipments for each given customer.
 * Used as a fallback when rh_customers.addresses is empty (which it is for Shopify-
 * imported customers — Shopify writes the address into the order/shipment, not the
 * customer record). Keyed by both customer id AND email so callers can match on
 * whichever they have.
 */
async function getLatestShipmentAddresses(
  tenantId: string,
  customers: { id: string; email?: string | null }[],
): Promise<Map<string, { street?: string; city?: string; postalCode?: string; country?: string; phone?: string }>> {
  const out = new Map<string, { street?: string; city?: string; postalCode?: string; country?: string; phone?: string }>();
  if (customers.length === 0) return out;

  const ids = customers.map((c) => c.id).filter(Boolean);
  const emails = customers.map((c) => (c.email || '').toLowerCase()).filter(Boolean);

  // Build an OR filter that matches by customer_id OR recipient_email (lowercased).
  const filters: string[] = [];
  if (ids.length > 0) filters.push(`customer_id.in.(${ids.join(',')})`);
  if (emails.length > 0) filters.push(`recipient_email.in.(${emails.map((e) => `"${e}"`).join(',')})`);
  if (filters.length === 0) return out;

  const { data: shipments } = await supabase
    .from('wh_shipments')
    .select('customer_id, recipient_email, recipient_phone, shipping_street, shipping_city, shipping_postal_code, shipping_country')
    .eq('tenant_id', tenantId)
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(500);

  if (!shipments) return out;

  for (const s of shipments) {
    const addr = {
      street: s.shipping_street || undefined,
      city: s.shipping_city || undefined,
      postalCode: s.shipping_postal_code || undefined,
      country: s.shipping_country || undefined,
      phone: s.recipient_phone || undefined,
    };
    // Most recent comes first (because of order desc) — only keep first hit per key.
    if (s.customer_id && !out.has(`id:${s.customer_id}`)) out.set(`id:${s.customer_id}`, addr);
    if (s.recipient_email) {
      const key = `email:${s.recipient_email.toLowerCase()}`;
      if (!out.has(key)) out.set(key, addr);
    }
  }

  return out;
}

/**
 * Picks address fields from rh_customers.addresses[0] (which can be a normalized
 * object with snake_case OR a raw Shopify shipping_address with address1/zip).
 */
function pickAddressFromCustomerRow(row: { addresses?: unknown }): { street?: string; city?: string; postalCode?: string; country?: string } {
  const arr = Array.isArray(row.addresses) ? row.addresses : [];
  const a = (arr[0] || {}) as Record<string, unknown>;
  return {
    street: (a.street as string) || (a.address1 as string) || undefined,
    city: (a.city as string) || undefined,
    postalCode: (a.postal_code as string) || (a.postalCode as string) || (a.zip as string) || undefined,
    country: (a.country_code as string) || (a.country as string) || undefined,
  };
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
  contactId?: string;
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
        contactId: c.id,
      });
    }
  }

  // Search B2C customers (from Returns Hub / Shopify import).
  // rh_customers has first_name/last_name/company (no single `name` column).
  const { data: customers } = await supabase
    .from('rh_customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`,
    )
    .limit(10);

  if (customers && customers.length > 0) {
    const shipmentAddrs = await getLatestShipmentAddresses(
      tenantId,
      customers.map((c) => ({ id: c.id, email: c.email })),
    );
    for (const c of customers) {
      const profileAddr = pickAddressFromCustomerRow(c);
      const fallback =
        shipmentAddrs.get(`id:${c.id}`) ||
        (c.email ? shipmentAddrs.get(`email:${c.email.toLowerCase()}`) : undefined) ||
        {};
      const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
        || c.company
        || c.email
        || '—';
      results.push({
        id: c.id,
        type: 'customer',
        name: fullName,
        company: c.company || undefined,
        email: c.email || undefined,
        phone: c.phone || fallback.phone || undefined,
        street: profileAddr.street || fallback.street || undefined,
        city: profileAddr.city || fallback.city || undefined,
        postalCode: profileAddr.postalCode || fallback.postalCode || undefined,
        country: profileAddr.country || fallback.country || undefined,
      });
    }
  }

  return results;
}

/**
 * Browse/search recipients for the picker dialog.
 * - When `query` is empty: returns the most recently active contacts and customers.
 * - When `query` is set: same fields as `searchRecipients` but configurable type filter and limit.
 */
export async function listRecipients(opts: {
  query?: string;
  typeFilter?: 'all' | 'b2b' | 'customer';
  limit?: number;
} = {}): Promise<RecipientSearchResult[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const query = (opts.query || '').trim();
  const typeFilter = opts.typeFilter || 'all';
  const limit = Math.max(1, Math.min(opts.limit ?? 30, 100));
  const perSource = typeFilter === 'all' ? limit : limit;
  const results: RecipientSearchResult[] = [];

  if (typeFilter === 'all' || typeFilter === 'b2b') {
    let q = supabase
      .from('wh_contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);
    if (query.length >= 1) {
      q = q.or(
        `contact_name.ilike.%${query}%,company_name.ilike.%${query}%,email.ilike.%${query}%`,
      );
    }
    const { data: contacts } = await q
      .order('updated_at', { ascending: false })
      .limit(perSource);
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
          contactId: c.id,
        });
      }
    }
  }

  if (typeFilter === 'all' || typeFilter === 'customer') {
    let q = supabase
      .from('rh_customers')
      .select('*')
      .eq('tenant_id', tenantId);
    if (query.length >= 1) {
      q = q.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`,
      );
    }
    // Prefer customers with real order activity first, then fall back to created_at.
    const { data: customers } = await q
      .order('last_order_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(perSource);
    if (customers && customers.length > 0) {
      const shipmentAddrs = await getLatestShipmentAddresses(
        tenantId,
        customers.map((c) => ({ id: c.id, email: c.email })),
      );
      for (const c of customers) {
        const profileAddr = pickAddressFromCustomerRow(c);
        const fallback =
          shipmentAddrs.get(`id:${c.id}`) ||
          (c.email ? shipmentAddrs.get(`email:${c.email.toLowerCase()}`) : undefined) ||
          {};
        const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
          || c.company
          || c.email
          || '—';
        results.push({
          id: c.id,
          type: 'customer',
          name: fullName,
          company: c.company || undefined,
          email: c.email || undefined,
          phone: c.phone || fallback.phone || undefined,
          street: profileAddr.street || fallback.street || undefined,
          city: profileAddr.city || fallback.city || undefined,
          postalCode: profileAddr.postalCode || fallback.postalCode || undefined,
          country: profileAddr.country || fallback.country || undefined,
        });
      }
    }
  }

  return results.slice(0, limit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShipmentBasic(row: any): WhShipment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shipmentNumber: row.shipment_number,
    status: row.status,
    recipientType: row.recipient_type,
    recipientName: row.recipient_name,
    recipientCompany: row.recipient_company || undefined,
    recipientEmail: row.recipient_email || undefined,
    recipientPhone: row.recipient_phone || undefined,
    shippingStreet: row.shipping_street,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state || undefined,
    shippingPostalCode: row.shipping_postal_code,
    shippingCountry: row.shipping_country,
    carrier: row.carrier || undefined,
    trackingNumber: row.tracking_number || undefined,
    totalItems: row.total_items || 0,
    priority: row.priority || 'normal',
    currency: row.currency || 'EUR',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceLocationName: row.wh_locations?.name || undefined,
    contactId: row.contact_id || undefined,
  };
}

export async function getContactShipments(contactId: string): Promise<WhShipment[]> {
  const { data, error } = await supabase
    .from('wh_shipments')
    .select('*, wh_locations(name)')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to load contact shipments:', error);
    return [];
  }
  return (data || []).map(transformShipmentBasic);
}

export async function getContactStats(contactId: string): Promise<ContactStats> {
  const { data: shipments, error } = await supabase
    .from('wh_shipments')
    .select('id, total_items, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error || !shipments) {
    return { totalShipments: 0, totalItemsShipped: 0, topProducts: [] };
  }

  const totalShipments = shipments.length;
  const totalItemsShipped = shipments.reduce((sum, s) => sum + (s.total_items || 0), 0);
  const lastShipmentDate = shipments[0]?.created_at || undefined;

  // Get top products from shipment items
  const shipmentIds = shipments.map(s => s.id);
  const topProducts: ContactStats['topProducts'] = [];

  if (shipmentIds.length > 0) {
    const { data: items } = await supabase
      .from('wh_shipment_items')
      .select('product_id, quantity, products(name)')
      .in('shipment_id', shipmentIds.slice(0, 50));

    if (items) {
      const productMap = new Map<string, { name: string; qty: number }>();
      for (const item of items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = item as any;
        const existing = productMap.get(row.product_id);
        if (existing) {
          existing.qty += row.quantity;
        } else {
          productMap.set(row.product_id, {
            name: row.products?.name || row.product_id.slice(0, 8),
            qty: row.quantity,
          });
        }
      }
      for (const [productId, { name, qty }] of productMap) {
        topProducts.push({ productId, productName: name, totalQuantity: qty });
      }
      topProducts.sort((a, b) => b.totalQuantity - a.totalQuantity);
    }
  }

  return { totalShipments, totalItemsShipped, lastShipmentDate, topProducts };
}
