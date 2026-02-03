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
  name: string;
  type: 'pdf' | 'image' | 'other';
  category: string;
  url?: string;
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
    name: row.name,
    type: row.type,
    category: row.category,
    url: row.url || undefined,
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
    validUntil?: string;
    visibility?: 'internal' | 'customs' | 'consumer';
  }
): Promise<{ success: boolean; document?: Document; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
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
