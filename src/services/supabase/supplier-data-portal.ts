/**
 * Supplier Data Portal Service
 * Admin CRUD for data requests + public access/validation/submit
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  SupplierDataRequest,
  CreateSupplierDataRequestParams,
  PublicSupplierDataRequestResult,
} from '@/types/supplier-data-portal';
import { getPublicBaseUrl } from '@/lib/platform';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDataRequest(row: any): SupplierDataRequest {
  // product_ids is JSONB array of UUID strings
  const productIds: string[] = Array.isArray(row.product_ids) ? row.product_ids : [];

  return {
    id: row.id,
    tenantId: row.tenant_id,
    supplierId: row.supplier_id,
    productId: row.product_id || productIds[0] || null,
    productIds,
    accessCode: row.access_code,
    // Never expose the stored hash: passwords are verified server-side only.
    passwordHash: '',
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
    productNames: row._productNames,
    supplierName: row.suppliers?.name,
  };
}

// ─── Admin Functions (authenticated) ────────────────────────────────────────

/**
 * Get all supplier data requests for current tenant, optionally filtered by product
 */
export async function getSupplierDataRequests(productId?: string): Promise<SupplierDataRequest[]> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('supplier_data_requests')
    .select('*, products(name), suppliers(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  // Filter by productId if provided (check product_ids JSONB array)
  let filtered = data;
  if (productId) {
    filtered = data.filter((row: any) => {
      const ids: string[] = Array.isArray(row.product_ids) ? row.product_ids : [];
      return ids.includes(productId) || row.product_id === productId;
    });
  }

  // Resolve product names for multi-product requests
  const allProductIds = new Set<string>();
  for (const row of filtered) {
    const ids: string[] = Array.isArray(row.product_ids) ? row.product_ids : [];
    ids.forEach(id => allProductIds.add(id));
  }

  let productNameMap: Record<string, string> = {};
  if (allProductIds.size > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', Array.from(allProductIds));

    if (products) {
      productNameMap = Object.fromEntries(products.map(p => [p.id, p.name]));
    }
  }

  return filtered.map((row: any) => {
    const ids: string[] = Array.isArray(row.product_ids) ? row.product_ids : [];
    const names = ids.map(id => productNameMap[id]).filter(Boolean);
    return transformDataRequest({
      ...row,
      _productNames: names,
    });
  });
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
      product_id: params.productIds[0] || null,
      product_ids: params.productIds,
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

  // Resolve product names
  let productNames: string[] = [];
  if (params.productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .in('id', params.productIds);
    if (products) {
      productNames = params.productIds.map(pid => products.find(p => p.id === pid)?.name).filter(Boolean) as string[];
    }
  }

  const url = `${getPublicBaseUrl()}/suppliers/data/${accessCode}`;

  return {
    dataRequest: transformDataRequest({ ...created, _productNames: productNames }),
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
// All public access goes through SECURITY DEFINER RPCs
// (supabase/migrations/20261001f_supplier_portal_rpc.sql). The access code
// plus the SHA-256 hex of the password is verified server-side (bcrypt), and
// the allowed-field whitelist is enforced in the database.

/** Password hashes verified in this browser session, keyed by access code. */
const verifiedPasswordHashes = new Map<string, string>();

function resolvePasswordHash(accessCode: string, passwordHash?: string): string {
  const hash = passwordHash || verifiedPasswordHashes.get(accessCode);
  if (!hash) throw new Error('Invalid password');
  return hash;
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  invalid_password: 'Invalid password',
  inactive: 'Data request is no longer active',
  expired: 'Data request has expired',
  locked: 'Too many failed attempts. Please try again later.',
  not_found: 'Data request not found',
  no_product: 'No product specified',
  product_not_in_request: 'Product not part of this data request',
  batch_edit_not_allowed: 'Batch editing not allowed',
  batch_create_not_allowed: 'Batch creation not allowed',
  batch_not_found: 'Batch not found',
  invalid_serial: 'Invalid serial number',
};

function rpcError(code: string | undefined): Error {
  return new Error((code && RPC_ERROR_MESSAGES[code]) || code || 'Request failed');
}

interface RpcResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/** Throws for transport errors (RAISE EXCEPTION '<code>') and { ok: false } results. */
function assertRpcOk(result: unknown, error: { message?: string } | null): RpcResult {
  if (error) throw rpcError(error.message);
  const r = result as RpcResult | null;
  if (!r?.ok) throw rpcError(r?.error);
  return r;
}

/**
 * Get a data request by access code (public, no auth)
 * Returns the request with tenant/product info for rendering the portal.
 * Contains no password hash.
 */
export async function getSupplierDataRequestByCode(
  accessCode: string,
): Promise<PublicSupplierDataRequestResult | null> {
  const { data, error } = await supabase.rpc('get_supplier_data_request_public', {
    p_access_code: accessCode,
  });

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any;
  const products: Array<{ id: string; name: string }> = Array.isArray(result.products) ? result.products : [];

  return {
    dataRequest: transformDataRequest({
      ...result.dataRequest,
      suppliers: null,
      _productNames: products.map(p => p.name),
    }),
    tenant: result.tenant,
    products,
    branding: {
      logoUrl: result.branding?.logoUrl ?? undefined,
      primaryColor: result.branding?.primaryColor ?? undefined,
    },
  };
}

/** Outcome of a server-side password check for the supplier data portal. */
export type SupplierDataPasswordCheck = 'ok' | 'invalid' | 'locked' | 'inactive' | 'expired' | 'error';

const PASSWORD_CHECK_ERRORS: ReadonlySet<string> = new Set(['locked', 'inactive', 'expired']);

/**
 * Verify the portal password server-side (public, no auth).
 * On success the request moves from pending to in_progress and the hash is
 * remembered for the following calls in this browser session.
 * Returns 'locked' during the lockout window (even for the correct password),
 * so the page can explain the lockout instead of reporting a wrong password.
 */
export async function verifySupplierDataRequestPassword(
  accessCode: string,
  passwordHash: string,
): Promise<SupplierDataPasswordCheck> {
  const { data, error } = await supabase.rpc('verify_supplier_data_request_password', {
    p_access_code: accessCode,
    p_password_hash: passwordHash,
  });

  if (error) {
    const code = error.message ?? '';
    if (PASSWORD_CHECK_ERRORS.has(code)) return code as SupplierDataPasswordCheck;
    console.warn('Supplier data request password check failed:', code);
    return 'error';
  }
  if (data === true) {
    verifiedPasswordHashes.set(accessCode, passwordHash);
    return 'ok';
  }
  return 'invalid';
}

/**
 * Load product data for a specific product in the data request portal (anon).
 * Requires a verified password (explicit or from verifySupplierDataRequestPassword).
 */
export async function publicGetProductForDataRequest(
  accessCode: string,
  productId?: string,
  passwordHash?: string,
): Promise<{ product: Record<string, unknown>; batches: Record<string, unknown>[] } | null> {
  const hash = passwordHash || verifiedPasswordHashes.get(accessCode);
  if (!hash) return null;

  const { data, error } = await supabase.rpc('get_supplier_data_request_product', {
    p_access_code: accessCode,
    p_password_hash: hash,
    p_product_id: productId ?? null,
  });

  const result = data as RpcResult | null;
  if (error || !result?.ok || !result.product) return null;

  return {
    product: result.product as Record<string, unknown>,
    batches: Array.isArray(result.batches) ? (result.batches as Record<string, unknown>[]) : [],
  };
}

/**
 * Submit product data updates from the portal (anon).
 * The server keeps only the fields allowed by the request.
 */
export async function publicSubmitProductData(
  accessCode: string,
  passwordHash: string,
  data: Record<string, unknown>,
  productId?: string,
): Promise<void> {
  const { data: result, error } = await supabase.rpc('submit_supplier_data_request_product', {
    p_access_code: accessCode,
    p_password_hash: resolvePasswordHash(accessCode, passwordHash),
    p_product_id: productId ?? null,
    p_data: data,
  });
  assertRpcOk(result, error);
}

/**
 * Submit batch data updates from the portal (anon)
 */
export async function publicSubmitBatchData(
  accessCode: string,
  passwordHash: string,
  batchId: string,
  data: Record<string, unknown>,
  productId?: string,
): Promise<void> {
  const { data: result, error } = await supabase.rpc('submit_supplier_data_request_batch', {
    p_access_code: accessCode,
    p_password_hash: resolvePasswordHash(accessCode, passwordHash),
    p_product_id: productId ?? null,
    p_batch_id: batchId,
    p_data: data,
  });
  assertRpcOk(result, error);
}

/**
 * Create a new batch from the portal (anon)
 */
export async function publicCreateBatch(
  accessCode: string,
  passwordHash: string,
  data: Record<string, unknown>,
  productId?: string,
): Promise<string> {
  const { data: result, error } = await supabase.rpc('create_supplier_data_request_batch', {
    p_access_code: accessCode,
    p_password_hash: resolvePasswordHash(accessCode, passwordHash),
    p_product_id: productId ?? null,
    p_data: data,
  });
  const r = assertRpcOk(result, error);
  if (typeof r.batchId !== 'string') throw rpcError(undefined);
  return r.batchId;
}

/**
 * Mark a data request as submitted (anon). Requires a verified password.
 */
export async function publicMarkDataRequestSubmitted(
  accessCode: string,
  passwordHash?: string,
): Promise<void> {
  const { data: result, error } = await supabase.rpc('mark_supplier_data_request_submitted', {
    p_access_code: accessCode,
    p_password_hash: resolvePasswordHash(accessCode, passwordHash),
  });
  assertRpcOk(result, error);
}

/**
 * Mark a data request as in_progress (anon).
 * Kept for API compatibility: verifySupplierDataRequestPassword() already
 * moves the request to in_progress server-side, so this is a no-op.
 */
export async function publicMarkDataRequestInProgress(accessCode: string): Promise<void> {
  void accessCode;
}
