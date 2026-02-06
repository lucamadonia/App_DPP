/**
 * Supabase Documents Service
 *
 * Dokumentenverwaltung mit Storage-Integration
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

export interface Document {
  id: string;
  tenant_id: string;
  product_id?: string;
  supplier_id?: string;
  folder_id?: string;
  name: string;
  type: 'pdf' | 'image' | 'other';
  category: string;
  url?: string;
  storagePath?: string;
  size?: string;
  validUntil?: string;
  uploadedAt: string;
  uploadedBy?: string;
  status: 'valid' | 'expiring' | 'expired';
  visibility: 'internal' | 'customs' | 'consumer';
}

// Transform database row to Document type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDocument(row: any): Document {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    product_id: row.product_id || undefined,
    supplier_id: row.supplier_id || undefined,
    folder_id: row.folder_id || undefined,
    name: row.name,
    type: row.type,
    category: row.category,
    url: row.url || undefined,
    storagePath: row.storage_path || undefined,
    size: row.size || undefined,
    validUntil: row.valid_until || undefined,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by || undefined,
    status: row.status,
    visibility: row.visibility || 'internal',
  };
}

/**
 * Get documents for current tenant
 */
export async function getDocuments(productId?: string): Promise<Document[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    console.warn('No tenant set - cannot load documents');
    return [];
  }

  let query = supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('uploaded_at', { ascending: false });

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load documents:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformDocument(row));
}

/**
 * Get a signed download URL for a document in storage
 */
export async function getDocumentDownloadUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) {
    console.error('Failed to get document URL:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return transformDocument(data);
}

/**
 * Upload a file to Supabase Storage and create document record
 */
export async function uploadDocument(
  file: File,
  metadata: {
    name: string;
    category: string;
    productId?: string;
    supplierId?: string;
    folderId?: string;
    validUntil?: string;
    visibility?: 'internal' | 'customs' | 'consumer';
  }
): Promise<{ success: boolean; document?: Document; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // Billing quota check
  const { checkQuota } = await import('./billing');
  const quota = await checkQuota('document', { tenantId });
  if (!quota.allowed) {
    return { success: false, error: `Document limit reached (${quota.current}/${quota.limit}). Please upgrade your plan.` };
  }

  // Determine file type
  let fileType: 'pdf' | 'image' | 'other' = 'other';
  if (file.type === 'application/pdf') {
    fileType = 'pdf';
  } else if (file.type.startsWith('image/')) {
    fileType = 'image';
  }

  // Generate unique file path
  const fileExt = file.name.split('.').pop();
  const fileName = `${tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file);

  if (uploadError) {
    console.error('Failed to upload file:', uploadError);
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(fileName);

  // Calculate status based on validity
  let status: 'valid' | 'expiring' | 'expired' = 'valid';
  if (metadata.validUntil) {
    const validDate = new Date(metadata.validUntil);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (validDate <= now) {
      status = 'expired';
    } else if (validDate <= thirtyDaysFromNow) {
      status = 'expiring';
    }
  }

  // Create document record
  const insertData = {
    tenant_id: tenantId,
    product_id: metadata.productId || null,
    supplier_id: metadata.supplierId || null,
    folder_id: metadata.folderId || null,
    name: metadata.name,
    type: fileType,
    category: metadata.category,
    storage_path: fileName,
    url: urlData.publicUrl,
    size: `${(file.size / 1024).toFixed(1)} KB`,
    valid_until: metadata.validUntil || null,
    status,
    visibility: metadata.visibility || 'internal',
  };

  const { data, error } = await supabase
    .from('documents')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create document record:', error);
    // Try to delete uploaded file
    await supabase.storage.from('documents').remove([fileName]);
    return { success: false, error: error.message };
  }

  return { success: true, document: transformDocument(data) };
}

/**
 * Create document record without file upload (for external URLs)
 */
export async function createDocument(
  doc: Omit<Document, 'id' | 'tenant_id' | 'uploadedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const insertData = {
    tenant_id: tenantId,
    product_id: doc.product_id || null,
    name: doc.name,
    type: doc.type,
    category: doc.category,
    url: doc.url || null,
    size: doc.size || null,
    valid_until: doc.validUntil || null,
    status: doc.status,
    visibility: doc.visibility || 'internal',
  };

  const { data, error } = await supabase
    .from('documents')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create document:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Update a document
 */
export async function updateDocument(
  id: string,
  doc: Partial<Document>
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (doc.name !== undefined) updateData.name = doc.name;
  if (doc.category !== undefined) updateData.category = doc.category;
  if (doc.validUntil !== undefined) updateData.valid_until = doc.validUntil || null;
  if (doc.status !== undefined) updateData.status = doc.status;
  if (doc.visibility !== undefined) updateData.visibility = doc.visibility;
  if (doc.product_id !== undefined) updateData.product_id = doc.product_id || null;
  if (doc.supplier_id !== undefined) updateData.supplier_id = doc.supplier_id || null;
  if (doc.folder_id !== undefined) updateData.folder_id = doc.folder_id || null;

  const { error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a document (and its file from storage)
 */
export async function deleteDocument(id: string): Promise<{ success: boolean; error?: string }> {
  // First get the document to find the storage path
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  // Delete from storage if there's a file
  if (doc?.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path]);
  }

  // Delete the record
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get document statistics
 */
export async function getDocumentStats(): Promise<{
  total: number;
  valid: number;
  expiring: number;
  expired: number;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { total: 0, valid: 0, expiring: 0, expired: 0 };
  }

  const { data, error } = await supabase
    .from('documents')
    .select('status')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return { total: 0, valid: 0, expiring: 0, expired: 0 };
  }

  return {
    total: data.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valid: data.filter((d: any) => d.status === 'valid').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiring: data.filter((d: any) => d.status === 'expiring').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expired: data.filter((d: any) => d.status === 'expired').length,
  };
}

/**
 * Get documents for a specific supplier
 */
export async function getSupplierDocuments(supplierId: string): Promise<Document[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    console.warn('No tenant set - cannot load supplier documents');
    return [];
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('supplier_id', supplierId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Failed to load supplier documents:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformDocument(row));
}

/**
 * Get document context counts for sidebar navigation
 */
export async function getDocumentContextCounts(): Promise<{
  products: Array<{ id: string; name: string; count: number }>;
  suppliers: Array<{ id: string; name: string; count: number }>;
  folders: Array<{ id: string; name: string; parentId?: string; count: number }>;
  unassigned: number;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { products: [], suppliers: [], folders: [], unassigned: 0 };
  }

  // Run all queries in parallel
  const [productDocs, supplierDocs, folderDocs, unassignedDocs] = await Promise.all([
    // Documents grouped by product
    supabase
      .from('documents')
      .select('product_id, products(name)')
      .eq('tenant_id', tenantId)
      .not('product_id', 'is', null),

    // Documents grouped by supplier
    supabase
      .from('documents')
      .select('supplier_id, suppliers(name)')
      .eq('tenant_id', tenantId)
      .not('supplier_id', 'is', null),

    // Documents grouped by folder
    supabase
      .from('documents')
      .select('folder_id, document_folders(name, parent_id)')
      .eq('tenant_id', tenantId)
      .not('folder_id', 'is', null),

    // Unassigned documents count
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('product_id', null)
      .is('supplier_id', null)
      .is('folder_id', null),
  ]);

  // Aggregate product counts
  const productMap = new Map<string, { name: string; count: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (productDocs.data || []) as any[]) {
    const id = row.product_id;
    const existing = productMap.get(id);
    if (existing) {
      existing.count++;
    } else {
      const name = row.products?.name || 'Unknown';
      productMap.set(id, { name, count: 1 });
    }
  }

  // Aggregate supplier counts
  const supplierMap = new Map<string, { name: string; count: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (supplierDocs.data || []) as any[]) {
    const id = row.supplier_id;
    const existing = supplierMap.get(id);
    if (existing) {
      existing.count++;
    } else {
      const name = row.suppliers?.name || 'Unknown';
      supplierMap.set(id, { name, count: 1 });
    }
  }

  // Aggregate folder counts
  const folderMap = new Map<string, { name: string; parentId?: string; count: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (folderDocs.data || []) as any[]) {
    const id = row.folder_id;
    const existing = folderMap.get(id);
    if (existing) {
      existing.count++;
    } else {
      const name = row.document_folders?.name || 'Unknown';
      const parentId = row.document_folders?.parent_id || undefined;
      folderMap.set(id, { name, parentId, count: 1 });
    }
  }

  return {
    products: Array.from(productMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    suppliers: Array.from(supplierMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    folders: Array.from(folderMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    unassigned: unassignedDocs.count ?? 0,
  };
}

/**
 * Upload product image to public bucket
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${tenantId}/${productId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Failed to upload image:', uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  return { success: true, url: urlData.publicUrl };
}
