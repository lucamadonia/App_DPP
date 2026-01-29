/**
 * Supabase Suppliers Service
 *
 * Lieferantenverwaltung mit RLS
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Supplier, SupplierProduct, SupplierContact } from '@/types/database';

// Transform database row to Supplier type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformSupplier(row: any): Supplier {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    code: row.code || undefined,
    legal_form: row.legal_form || undefined,
    contact_person: row.contact_person || undefined,
    contact_position: row.contact_position || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    mobile: row.mobile || undefined,
    fax: row.fax || undefined,
    additional_contacts: row.additional_contacts as SupplierContact[] | undefined,
    website: row.website || undefined,
    linkedin: row.linkedin || undefined,
    address: row.address || undefined,
    address_line2: row.address_line2 || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    country: row.country,
    postal_code: row.postal_code || undefined,
    shipping_address: row.shipping_address || undefined,
    shipping_city: row.shipping_city || undefined,
    shipping_country: row.shipping_country || undefined,
    shipping_postal_code: row.shipping_postal_code || undefined,
    tax_id: row.tax_id || undefined,
    vat_id: row.vat_id || undefined,
    duns_number: row.duns_number || undefined,
    registration_number: row.registration_number || undefined,
    bank_name: row.bank_name || undefined,
    iban: row.iban || undefined,
    bic: row.bic || undefined,
    payment_terms: row.payment_terms || undefined,
    risk_level: row.risk_level,
    quality_rating: row.quality_rating || undefined,
    delivery_rating: row.delivery_rating || undefined,
    verified: row.verified,
    verification_date: row.verification_date || undefined,
    verified_by: row.verified_by || undefined,
    certifications: row.certifications || undefined,
    audit_date: row.audit_date || undefined,
    next_audit_date: row.next_audit_date || undefined,
    compliance_status: row.compliance_status || undefined,
    supplier_type: row.supplier_type || undefined,
    industry: row.industry || undefined,
    product_categories: row.product_categories || undefined,
    contract_start: row.contract_start || undefined,
    contract_end: row.contract_end || undefined,
    min_order_value: row.min_order_value || undefined,
    currency: row.currency || undefined,
    notes: row.notes || undefined,
    internal_notes: row.internal_notes || undefined,
    tags: row.tags || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
    createdBy: row.created_by || undefined,
  };
}

/**
 * Get all suppliers for current tenant
 */
export async function getSuppliers(): Promise<Supplier[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return [];
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) {
    console.error('Failed to load suppliers:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformSupplier(row));
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(id: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return transformSupplier(data);
}

/**
 * Create a new supplier
 */
export async function createSupplier(
  supplier: Omit<Supplier, 'id' | 'tenant_id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const insertData = {
    tenant_id: tenantId,
    name: supplier.name,
    code: supplier.code || null,
    legal_form: supplier.legal_form || null,
    contact_person: supplier.contact_person || null,
    contact_position: supplier.contact_position || null,
    email: supplier.email || null,
    phone: supplier.phone || null,
    mobile: supplier.mobile || null,
    fax: supplier.fax || null,
    additional_contacts: supplier.additional_contacts || null,
    website: supplier.website || null,
    linkedin: supplier.linkedin || null,
    address: supplier.address || null,
    address_line2: supplier.address_line2 || null,
    city: supplier.city || null,
    state: supplier.state || null,
    country: supplier.country,
    postal_code: supplier.postal_code || null,
    shipping_address: supplier.shipping_address || null,
    shipping_city: supplier.shipping_city || null,
    shipping_country: supplier.shipping_country || null,
    shipping_postal_code: supplier.shipping_postal_code || null,
    tax_id: supplier.tax_id || null,
    vat_id: supplier.vat_id || null,
    duns_number: supplier.duns_number || null,
    registration_number: supplier.registration_number || null,
    bank_name: supplier.bank_name || null,
    iban: supplier.iban || null,
    bic: supplier.bic || null,
    payment_terms: supplier.payment_terms || null,
    risk_level: supplier.risk_level,
    quality_rating: supplier.quality_rating || null,
    delivery_rating: supplier.delivery_rating || null,
    verified: supplier.verified,
    verification_date: supplier.verification_date || null,
    verified_by: supplier.verified_by || null,
    certifications: supplier.certifications || null,
    audit_date: supplier.audit_date || null,
    next_audit_date: supplier.next_audit_date || null,
    compliance_status: supplier.compliance_status || null,
    supplier_type: supplier.supplier_type || null,
    industry: supplier.industry || null,
    product_categories: supplier.product_categories || null,
    contract_start: supplier.contract_start || null,
    contract_end: supplier.contract_end || null,
    min_order_value: supplier.min_order_value || null,
    currency: supplier.currency || null,
    notes: supplier.notes || null,
    internal_notes: supplier.internal_notes || null,
    tags: supplier.tags || null,
    status: supplier.status,
  };

  const { data, error } = await supabase
    .from('suppliers')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create supplier:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Update a supplier
 */
export async function updateSupplier(
  id: string,
  supplier: Partial<Supplier>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Grunddaten
  if (supplier.name !== undefined) updateData.name = supplier.name;
  if (supplier.code !== undefined) updateData.code = supplier.code || null;
  if (supplier.legal_form !== undefined) updateData.legal_form = supplier.legal_form || null;

  // Kontaktdaten
  if (supplier.contact_person !== undefined) updateData.contact_person = supplier.contact_person || null;
  if (supplier.contact_position !== undefined) updateData.contact_position = supplier.contact_position || null;
  if (supplier.email !== undefined) updateData.email = supplier.email || null;
  if (supplier.phone !== undefined) updateData.phone = supplier.phone || null;
  if (supplier.mobile !== undefined) updateData.mobile = supplier.mobile || null;
  if (supplier.fax !== undefined) updateData.fax = supplier.fax || null;
  if (supplier.additional_contacts !== undefined) updateData.additional_contacts = supplier.additional_contacts || null;
  if (supplier.website !== undefined) updateData.website = supplier.website || null;
  if (supplier.linkedin !== undefined) updateData.linkedin = supplier.linkedin || null;

  // Hauptadresse
  if (supplier.address !== undefined) updateData.address = supplier.address || null;
  if (supplier.address_line2 !== undefined) updateData.address_line2 = supplier.address_line2 || null;
  if (supplier.city !== undefined) updateData.city = supplier.city || null;
  if (supplier.state !== undefined) updateData.state = supplier.state || null;
  if (supplier.country !== undefined) updateData.country = supplier.country;
  if (supplier.postal_code !== undefined) updateData.postal_code = supplier.postal_code || null;

  // Lieferadresse
  if (supplier.shipping_address !== undefined) updateData.shipping_address = supplier.shipping_address || null;
  if (supplier.shipping_city !== undefined) updateData.shipping_city = supplier.shipping_city || null;
  if (supplier.shipping_country !== undefined) updateData.shipping_country = supplier.shipping_country || null;
  if (supplier.shipping_postal_code !== undefined) updateData.shipping_postal_code = supplier.shipping_postal_code || null;

  // Rechtliche Daten
  if (supplier.tax_id !== undefined) updateData.tax_id = supplier.tax_id || null;
  if (supplier.vat_id !== undefined) updateData.vat_id = supplier.vat_id || null;
  if (supplier.duns_number !== undefined) updateData.duns_number = supplier.duns_number || null;
  if (supplier.registration_number !== undefined) updateData.registration_number = supplier.registration_number || null;

  // Bankverbindung
  if (supplier.bank_name !== undefined) updateData.bank_name = supplier.bank_name || null;
  if (supplier.iban !== undefined) updateData.iban = supplier.iban || null;
  if (supplier.bic !== undefined) updateData.bic = supplier.bic || null;
  if (supplier.payment_terms !== undefined) updateData.payment_terms = supplier.payment_terms || null;

  // Bewertung & Status
  if (supplier.risk_level !== undefined) updateData.risk_level = supplier.risk_level;
  if (supplier.quality_rating !== undefined) updateData.quality_rating = supplier.quality_rating || null;
  if (supplier.delivery_rating !== undefined) updateData.delivery_rating = supplier.delivery_rating || null;
  if (supplier.verified !== undefined) updateData.verified = supplier.verified;
  if (supplier.verification_date !== undefined) updateData.verification_date = supplier.verification_date || null;
  if (supplier.verified_by !== undefined) updateData.verified_by = supplier.verified_by || null;

  // Compliance
  if (supplier.certifications !== undefined) updateData.certifications = supplier.certifications || null;
  if (supplier.audit_date !== undefined) updateData.audit_date = supplier.audit_date || null;
  if (supplier.next_audit_date !== undefined) updateData.next_audit_date = supplier.next_audit_date || null;
  if (supplier.compliance_status !== undefined) updateData.compliance_status = supplier.compliance_status || null;

  // Kategorisierung
  if (supplier.supplier_type !== undefined) updateData.supplier_type = supplier.supplier_type || null;
  if (supplier.industry !== undefined) updateData.industry = supplier.industry || null;
  if (supplier.product_categories !== undefined) updateData.product_categories = supplier.product_categories || null;

  // Verträge
  if (supplier.contract_start !== undefined) updateData.contract_start = supplier.contract_start || null;
  if (supplier.contract_end !== undefined) updateData.contract_end = supplier.contract_end || null;
  if (supplier.min_order_value !== undefined) updateData.min_order_value = supplier.min_order_value || null;
  if (supplier.currency !== undefined) updateData.currency = supplier.currency || null;

  // Notizen & Tags
  if (supplier.notes !== undefined) updateData.notes = supplier.notes || null;
  if (supplier.internal_notes !== undefined) updateData.internal_notes = supplier.internal_notes || null;
  if (supplier.tags !== undefined) updateData.tags = supplier.tags || null;
  if (supplier.status !== undefined) updateData.status = supplier.status;

  const { error } = await supabase
    .from('suppliers')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update supplier:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(id: string): Promise<{ success: boolean; error?: string }> {
  // First delete supplier-product associations
  await supabase
    .from('supplier_products')
    .delete()
    .eq('supplier_id', id);

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete supplier:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// SUPPLIER-PRODUCT ASSOCIATIONS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformSupplierProduct(row: any): SupplierProduct {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    supplier_id: row.supplier_id,
    product_id: row.product_id,
    role: row.role,
    is_primary: row.is_primary,
    lead_time_days: row.lead_time_days || undefined,
    price_per_unit: row.price_per_unit || undefined,
    currency: row.currency || undefined,
    min_order_quantity: row.min_order_quantity || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Get products for a supplier
 */
export async function getSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('supplier_id', supplierId);

  if (error) {
    console.error('Failed to load supplier products:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformSupplierProduct(row));
}

/**
 * Get suppliers for a product
 */
export async function getProductSuppliers(productId: string): Promise<SupplierProduct[]> {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('product_id', productId);

  if (error) {
    console.error('Failed to load product suppliers:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformSupplierProduct(row));
}

/**
 * Assign product to supplier
 */
export async function assignProductToSupplier(
  data: Omit<SupplierProduct, 'id' | 'tenant_id' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const insertData = {
    tenant_id: tenantId,
    supplier_id: data.supplier_id,
    product_id: data.product_id,
    role: data.role,
    is_primary: data.is_primary,
    lead_time_days: data.lead_time_days || null,
    price_per_unit: data.price_per_unit || null,
    currency: data.currency || null,
    min_order_quantity: data.min_order_quantity || null,
    notes: data.notes || null,
  };

  const { data: result, error } = await supabase
    .from('supplier_products')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to assign product to supplier:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: result.id };
}

/**
 * Get suppliers for a product with supplier details (name, country)
 */
export async function getProductSuppliersWithDetails(productId: string): Promise<Array<SupplierProduct & { supplier_name: string; supplier_country: string }>> {
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*, suppliers(name, country)')
    .eq('product_id', productId);

  if (error) {
    console.error('Failed to load product suppliers with details:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    ...transformSupplierProduct(row),
    supplier_name: row.suppliers?.name || 'Unbekannt',
    supplier_country: row.suppliers?.country || '',
  }));
}

/**
 * Remove product-supplier association
 */
export async function removeProductFromSupplier(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('supplier_products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to remove product from supplier:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
