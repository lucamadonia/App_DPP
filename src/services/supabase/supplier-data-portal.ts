/**
 * Supplier Data Portal Service
 * Admin CRUD for data requests + public access/validation/submit
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { filterProductFieldsToColumns, filterBatchFieldsToColumns } from '@/lib/supplier-data-fields';
import type {
  SupplierDataRequest,
  CreateSupplierDataRequestParams,
  PublicSupplierDataRequestResult,
} from '@/types/supplier-data-portal';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDataRequest(row: any): SupplierDataRequest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    supplierId: row.supplier_id,
    productId: row.product_id,
    accessCode: row.access_code,
    passwordHash: row.password_hash,
    allowedProductFields: row.allowed_product_fields || [],
    allowedBatchFields: row.allowed_batch_fields || [],
    allowBatchCreate: row.allow_batch_create,
    allowBatchEdit: row.allow_batch_edit,
    status: row.status,
    message: row.message,
    expiresAt: row.expires_at,
    submittedAt: row.submitted_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Joined fields
    productName: row.products?.name,
    supplierName: row.suppliers?.name,
  };
}

// ─── Admin Functions (authenticated) ────────────────────────────────────────

/**
 * Get all supplier data requests for current tenant, optionally filtered by product
 */
export async function getSupplierDataRequests(productId?: string): Promise<SupplierDataRequest[]> {
  const tenantId = await getCurrentTenantId();

  let query = supabase
    .from('supplier_data_requests')
    .select('*, products(name), suppliers(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ? data.map(transformDataRequest) : [];
}

/**
 * Create a new supplier data request
 */
export async function createSupplierDataRequest(
  params: CreateSupplierDataRequestParams,
): Promise<{ dataRequest: SupplierDataRequest; url: string }> {
  const tenantId = await getCurrentTenantId();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const id = crypto.randomUUID();
  const accessCode = crypto.randomUUID();

  const { error } = await supabase
    .from('supplier_data_requests')
    .insert({
      id,
      tenant_id: tenantId,
      supplier_id: params.supplierId || null,
      product_id: params.productId,
      access_code: accessCode,
      password_hash: params.passwordHash,
      allowed_product_fields: params.allowedProductFields,
      allowed_batch_fields: params.allowedBatchFields,
      allow_batch_create: params.allowBatchCreate,
      allow_batch_edit: params.allowBatchEdit,
      message: params.message || null,
      expires_at: params.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: user.user.id,
    });

  if (error) throw error;

  // Fetch the created request with joins
  const { data: created, error: fetchError } = await supabase
    .from('supplier_data_requests')
    .select('*, products(name), suppliers(name)')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const url = `${window.location.origin}/suppliers/data/${accessCode}`;

  return {
    dataRequest: transformDataRequest(created),
    url,
  };
}

/**
 * Cancel a data request
 */
export async function cancelSupplierDataRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from('supplier_data_requests')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete a data request
 */
export async function deleteSupplierDataRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from('supplier_data_requests')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Public Functions (anon) ────────────────────────────────────────────────

/**
 * Get a data request by access code (public, no auth)
 * Returns the request with tenant/product info for rendering the portal
 */
export async function getSupplierDataRequestByCode(
  accessCode: string,
): Promise<PublicSupplierDataRequestResult | null> {
  const { data, error } = await supabase
    .from('supplier_data_requests')
    .select('*, products(id, name), tenants:tenant_id(id, name, slug, settings)')
    .eq('access_code', accessCode)
    .single();

  if (error || !data) return null;

  const tenant = data.tenants as any;
  const product = data.products as any;
  const branding = tenant?.settings?.branding || {};

  return {
    dataRequest: transformDataRequest({ ...data, products: product, suppliers: null }),
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    product: { id: product.id, name: product.name },
    branding: {
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
    },
  };
}

/**
 * Load product data for the data request portal (anon)
 */
export async function publicGetProductForDataRequest(
  accessCode: string,
): Promise<{ product: Record<string, unknown>; batches: Record<string, unknown>[] } | null> {
  // First verify the data request
  const { data: req, error: reqError } = await supabase
    .from('supplier_data_requests')
    .select('product_id, allowed_product_fields, allowed_batch_fields, status, expires_at')
    .eq('access_code', accessCode)
    .single();

  if (reqError || !req) return null;
  if (req.status === 'expired' || req.status === 'cancelled') return null;
  if (new Date(req.expires_at) < new Date()) return null;

  // Load product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', req.product_id)
    .single();

  if (productError || !product) return null;

  // Load batches
  const { data: batches, error: batchesError } = await supabase
    .from('product_batches')
    .select('*')
    .eq('product_id', req.product_id)
    .order('created_at', { ascending: false });

  if (batchesError) return null;

  return { product, batches: batches || [] };
}

/**
 * Submit product data updates from the portal (anon)
 * Filters data to only allowed fields before writing
 */
export async function publicSubmitProductData(
  accessCode: string,
  passwordHash: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Verify request + password
  const { data: req, error: reqError } = await supabase
    .from('supplier_data_requests')
    .select('*')
    .eq('access_code', accessCode)
    .single();

  if (reqError || !req) throw new Error('Data request not found');
  if (req.password_hash !== passwordHash) throw new Error('Invalid password');
  if (req.status === 'expired' || req.status === 'cancelled' || req.status === 'submitted') {
    throw new Error('Data request is no longer active');
  }
  if (new Date(req.expires_at) < new Date()) throw new Error('Data request has expired');

  // Filter to only allowed fields and convert to DB columns
  const filteredData = filterProductFieldsToColumns(data, req.allowed_product_fields || []);

  if (Object.keys(filteredData).length > 0) {
    const { error } = await supabase
      .from('products')
      .update(filteredData)
      .eq('id', req.product_id);

    if (error) throw error;
  }
}

/**
 * Submit batch data updates from the portal (anon)
 */
export async function publicSubmitBatchData(
  accessCode: string,
  passwordHash: string,
  batchId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { data: req, error: reqError } = await supabase
    .from('supplier_data_requests')
    .select('*')
    .eq('access_code', accessCode)
    .single();

  if (reqError || !req) throw new Error('Data request not found');
  if (req.password_hash !== passwordHash) throw new Error('Invalid password');
  if (!req.allow_batch_edit) throw new Error('Batch editing not allowed');
  if (req.status === 'expired' || req.status === 'cancelled' || req.status === 'submitted') {
    throw new Error('Data request is no longer active');
  }
  if (new Date(req.expires_at) < new Date()) throw new Error('Data request has expired');

  const filteredData = filterBatchFieldsToColumns(data, req.allowed_batch_fields || []);

  if (Object.keys(filteredData).length > 0) {
    const { error } = await supabase
      .from('product_batches')
      .update(filteredData)
      .eq('id', batchId)
      .eq('product_id', req.product_id);

    if (error) throw error;
  }
}

/**
 * Create a new batch from the portal (anon)
 */
export async function publicCreateBatch(
  accessCode: string,
  passwordHash: string,
  data: Record<string, unknown>,
): Promise<string> {
  const { data: req, error: reqError } = await supabase
    .from('supplier_data_requests')
    .select('*')
    .eq('access_code', accessCode)
    .single();

  if (reqError || !req) throw new Error('Data request not found');
  if (req.password_hash !== passwordHash) throw new Error('Invalid password');
  if (!req.allow_batch_create) throw new Error('Batch creation not allowed');
  if (req.status === 'expired' || req.status === 'cancelled' || req.status === 'submitted') {
    throw new Error('Data request is no longer active');
  }
  if (new Date(req.expires_at) < new Date()) throw new Error('Data request has expired');

  const filteredData = filterBatchFieldsToColumns(data, req.allowed_batch_fields || []);

  const batchId = crypto.randomUUID();

  const { error } = await supabase
    .from('product_batches')
    .insert({
      id: batchId,
      tenant_id: req.tenant_id,
      product_id: req.product_id,
      serial_number: (data.serialNumber as string) || crypto.randomUUID().slice(0, 8),
      ...filteredData,
    });

  if (error) throw error;
  return batchId;
}

/**
 * Mark a data request as submitted (anon)
 */
export async function publicMarkDataRequestSubmitted(accessCode: string): Promise<void> {
  const { error } = await supabase
    .from('supplier_data_requests')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('access_code', accessCode);

  if (error) throw error;
}

/**
 * Mark a data request as in_progress (anon)
 */
export async function publicMarkDataRequestInProgress(accessCode: string): Promise<void> {
  const { error } = await supabase
    .from('supplier_data_requests')
    .update({ status: 'in_progress' })
    .eq('access_code', accessCode)
    .eq('status', 'pending');

  // Ignore errors — it's fine if status was already changed
  if (error) console.warn('Could not update status to in_progress:', error.message);
}
