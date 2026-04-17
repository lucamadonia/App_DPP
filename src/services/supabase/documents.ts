/**
 * Supabase Documents Service
 *
 * Dokumentenverwaltung mit Storage-Integration
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

export interface DocumentAIHint {
  id?: string;
  type: string;
  message: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

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
  description?: string;
  hints?: DocumentAIHint[];
  aiClassification?: Record<string, unknown>;
  aiConfidence?: number;
  aiClassifiedAt?: string;
  aiModel?: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  storagePath?: string;
  size?: string;
  type: 'pdf' | 'image' | 'other';
  validUntil?: string;
  uploadedAt: string;
  uploadedBy?: string;
  changeNote?: string;
  aiConfidence?: number;
  aiModel?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformVersion(row: any): DocumentVersion {
  return {
    id: row.id,
    documentId: row.document_id,
    versionNumber: row.version_number,
    fileName: row.file_name,
    storagePath: row.storage_path || undefined,
    size: row.size || undefined,
    type: row.type,
    validUntil: row.valid_until || undefined,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by || undefined,
    changeNote: row.change_note || undefined,
    aiConfidence: row.ai_confidence == null ? undefined : Number(row.ai_confidence),
    aiModel: row.ai_model || undefined,
  };
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
    description: row.description || undefined,
    hints: Array.isArray(row.hints) ? row.hints : undefined,
    aiClassification: row.ai_classification || undefined,
    aiConfidence: row.ai_confidence == null ? undefined : Number(row.ai_confidence),
    aiClassifiedAt: row.ai_classified_at || undefined,
    aiModel: row.ai_model || undefined,
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
    description?: string;
    hints?: DocumentAIHint[];
    aiClassification?: Record<string, unknown>;
    aiConfidence?: number;
    aiModel?: string;
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
  const insertData: Record<string, unknown> = {
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
    description: metadata.description || null,
    hints: metadata.hints && metadata.hints.length > 0 ? metadata.hints : null,
    ai_classification: metadata.aiClassification || null,
    ai_confidence: metadata.aiConfidence ?? null,
    ai_classified_at: metadata.aiClassification ? new Date().toISOString() : null,
    ai_model: metadata.aiModel || null,
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

  // Seed v1 in document_versions
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from('document_versions').insert({
    tenant_id: tenantId,
    document_id: data.id,
    version_number: 1,
    file_name: file.name,
    storage_path: fileName,
    size: insertData.size as string,
    type: fileType,
    valid_until: metadata.validUntil || null,
    uploaded_by: userData?.user?.id ?? null,
    ai_classification: metadata.aiClassification || null,
    ai_confidence: metadata.aiConfidence ?? null,
    ai_model: metadata.aiModel || null,
  });

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
  if (doc.description !== undefined) updateData.description = doc.description || null;
  if (doc.hints !== undefined) updateData.hints = doc.hints && doc.hints.length > 0 ? doc.hints : null;

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
  // Collect all storage paths from versions + current doc, so we can clean storage
  // (DB CASCADE will delete version rows, but not storage blobs).
  const [{ data: doc }, { data: versions }] = await Promise.all([
    supabase.from('documents').select('storage_path').eq('id', id).single(),
    supabase.from('document_versions').select('storage_path').eq('document_id', id),
  ]);

  const paths = new Set<string>();
  if (doc?.storage_path) paths.add(doc.storage_path);
  for (const v of versions || []) {
    if (v.storage_path) paths.add(v.storage_path);
  }
  if (paths.size > 0) {
    await supabase.storage.from('documents').remove(Array.from(paths));
  }

  // Delete the record — ON DELETE CASCADE removes document_versions rows
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
 * Get all documents with AI hints (any state).
 * Use `onlyOpen=true` to filter out hints that have been acknowledged.
 */
export async function getDocumentsWithHints(
  onlyOpen: boolean = true
): Promise<Document[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .not('hints', 'is', null)
    .order('ai_classified_at', { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error('Failed to load docs with hints', error);
    return [];
  }

  const docs = data.map(transformDocument);
  if (!onlyOpen) return docs.filter((d) => d.hints && d.hints.length > 0);

  return docs
    .map((d) => ({
      ...d,
      hints: (d.hints || []).filter((h) => !h.acknowledgedAt),
    }))
    .filter((d) => d.hints && d.hints.length > 0);
}

/**
 * Acknowledge a specific hint of a document.
 * Merges acknowledgment state into the existing hints JSON array.
 * Pass hintId=null to acknowledge ALL open hints on the document at once.
 */
export async function acknowledgeDocumentHint(
  docId: string,
  hintId: string | null,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Fetch current hints
  const { data: current, error: fetchError } = await supabase
    .from('documents')
    .select('hints')
    .eq('id', docId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: fetchError?.message || 'Document not found' };
  }

  const currentHints = Array.isArray(current.hints) ? current.hints : [];
  const nowIso = new Date().toISOString();
  const updated = currentHints.map((h: DocumentAIHint & { id?: string; acknowledgedAt?: string; acknowledgedBy?: string }) => {
    if (h.acknowledgedAt) return h; // already acknowledged
    if (hintId === null || h.id === hintId) {
      return { ...h, acknowledgedAt: nowIso, acknowledgedBy: userId ?? undefined };
    }
    return h;
  });

  const { error: updateError } = await supabase
    .from('documents')
    .update({ hints: updated })
    .eq('id', docId)
    .eq('tenant_id', tenantId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Get all versions for a document (newest first).
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .eq('tenant_id', tenantId)
    .order('version_number', { ascending: false });

  if (error) {
    console.error('Failed to load document versions:', error);
    return [];
  }

  return (data || []).map(transformVersion);
}

/**
 * Upload a new version of an existing document.
 * Archives the old current state as a version row and updates the documents
 * row to point at the newly uploaded file.
 */
export async function uploadDocumentVersion(
  documentId: string,
  file: File,
  opts: { changeNote?: string } = {}
): Promise<{ success: boolean; version?: DocumentVersion; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Load current document (tenant-scoped)
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('tenant_id', tenantId)
    .single();

  if (docError || !doc) {
    return { success: false, error: docError?.message || 'Document not found' };
  }

  // Determine new file type
  let fileType: 'pdf' | 'image' | 'other' = 'other';
  if (file.type === 'application/pdf') fileType = 'pdf';
  else if (file.type.startsWith('image/')) fileType = 'image';

  // Upload to storage with unique path (same convention as uploadDocument)
  const fileExt = file.name.split('.').pop();
  const storagePath = `${tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file);

  if (uploadError) {
    console.error('Failed to upload new version:', uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

  // Determine next version number
  const { data: maxRow } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .eq('tenant_id', tenantId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (maxRow?.version_number ?? 0) + 1;

  const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

  // Insert the new version row
  const { data: userData } = await supabase.auth.getUser();
  const { data: versionRow, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      tenant_id: tenantId,
      document_id: documentId,
      version_number: nextVersion,
      file_name: file.name,
      storage_path: storagePath,
      size: sizeStr,
      type: fileType,
      valid_until: doc.valid_until,
      uploaded_by: userData?.user?.id ?? null,
      change_note: opts.changeNote || null,
    })
    .select()
    .single();

  if (versionError) {
    await supabase.storage.from('documents').remove([storagePath]);
    return { success: false, error: versionError.message };
  }

  // Update documents row to point at the new file
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      storage_path: storagePath,
      url: urlData.publicUrl,
      size: sizeStr,
      type: fileType,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userData?.user?.id ?? null,
    })
    .eq('id', documentId)
    .eq('tenant_id', tenantId);

  if (updateError) {
    // Best-effort rollback: delete version row + storage blob
    await supabase.from('document_versions').delete().eq('id', versionRow.id);
    await supabase.storage.from('documents').remove([storagePath]);
    return { success: false, error: updateError.message };
  }

  return { success: true, version: transformVersion(versionRow) };
}

/**
 * Restore an older version as a new current version.
 * Creates a new version row (with the old version's storage_path reused) and
 * updates the documents row to point at it. Change note marks the restore.
 */
export async function restoreDocumentVersion(
  documentId: string,
  versionId: string
): Promise<{ success: boolean; version?: DocumentVersion; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Load the version to restore
  const { data: src, error: srcError } = await supabase
    .from('document_versions')
    .select('*')
    .eq('id', versionId)
    .eq('document_id', documentId)
    .eq('tenant_id', tenantId)
    .single();

  if (srcError || !src) {
    return { success: false, error: srcError?.message || 'Version not found' };
  }

  // Next version number
  const { data: maxRow } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .eq('tenant_id', tenantId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (maxRow?.version_number ?? 0) + 1;

  const { data: userData } = await supabase.auth.getUser();

  // Insert restored version row (reusing same storage_path — blob is shared)
  const { data: versionRow, error: versionError } = await supabase
    .from('document_versions')
    .insert({
      tenant_id: tenantId,
      document_id: documentId,
      version_number: nextVersion,
      file_name: src.file_name,
      storage_path: src.storage_path,
      size: src.size,
      type: src.type,
      valid_until: src.valid_until,
      uploaded_by: userData?.user?.id ?? null,
      change_note: `Restored from v${src.version_number}`,
      ai_classification: src.ai_classification,
      ai_confidence: src.ai_confidence,
      ai_model: src.ai_model,
    })
    .select()
    .single();

  if (versionError) {
    return { success: false, error: versionError.message };
  }

  // Update documents row to point at restored file
  let publicUrl: string | undefined;
  if (src.storage_path) {
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(src.storage_path);
    publicUrl = urlData?.publicUrl;
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update({
      storage_path: src.storage_path,
      url: publicUrl ?? null,
      size: src.size,
      type: src.type,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userData?.user?.id ?? null,
    })
    .eq('id', documentId)
    .eq('tenant_id', tenantId);

  if (updateError) {
    await supabase.from('document_versions').delete().eq('id', versionRow.id);
    return { success: false, error: updateError.message };
  }

  return { success: true, version: transformVersion(versionRow) };
}

/**
 * Delete a non-current version. Fails if the version is the current one
 * (highest version_number). Removes the storage blob only if no other
 * version references the same path.
 */
export async function deleteDocumentVersion(
  versionId: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data: version, error: fetchError } = await supabase
    .from('document_versions')
    .select('*')
    .eq('id', versionId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !version) {
    return { success: false, error: fetchError?.message || 'Version not found' };
  }

  // Guard: can't delete current version (highest version_number)
  const { data: maxRow } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', version.document_id)
    .eq('tenant_id', tenantId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxRow && maxRow.version_number === version.version_number) {
    return { success: false, error: 'Cannot delete current version' };
  }

  // Check if any other version still references this storage_path (shared by restore)
  let canRemoveBlob = false;
  if (version.storage_path) {
    const { count } = await supabase
      .from('document_versions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('storage_path', version.storage_path)
      .neq('id', versionId);
    canRemoveBlob = (count ?? 0) === 0;
  }

  const { error: deleteError } = await supabase
    .from('document_versions')
    .delete()
    .eq('id', versionId)
    .eq('tenant_id', tenantId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (canRemoveBlob && version.storage_path) {
    await supabase.storage.from('documents').remove([version.storage_path]);
  }

  return { success: true };
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
