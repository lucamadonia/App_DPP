/**
 * Tenant Pictograms Service
 *
 * CRUD + file upload for per-tenant pictogram storage.
 * 200 MB quota per tenant.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { TenantPictogram } from '@/types/database';

// 200 MB quota
export const TENANT_PICTOGRAM_QUOTA = 200 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTenantPictogram(row: any): TenantPictogram {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description || '',
    category: row.category || 'custom',
    regulationYear: row.regulation_year || '',
    fileUrl: row.file_url,
    fileType: row.file_type,
    fileSize: row.file_size || 0,
    tags: row.tags || [],
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTenantPictograms(): Promise<TenantPictogram[]> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('tenant_pictograms')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('regulation_year', { ascending: false })
    .order('name');

  if (error) throw error;
  return (data || []).map(transformTenantPictogram);
}

export async function getTenantPictogramStorageUsage(): Promise<number> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('tenant_pictograms')
    .select('file_size')
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + (row.file_size || 0), 0);
}

export async function uploadTenantPictogram(
  file: File,
  metadata: {
    name: string;
    description?: string;
    category?: string;
    regulationYear?: string;
    tags?: string[];
  }
): Promise<TenantPictogram> {
  const tenantId = await getCurrentTenantId();

  // Check quota
  const currentUsage = await getTenantPictogramStorageUsage();
  if (currentUsage + file.size > TENANT_PICTOGRAM_QUOTA) {
    throw new Error('Storage quota reached (200 MB)');
  }

  // Determine file type
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!['svg', 'png', 'jpg', 'jpeg'].includes(ext)) {
    throw new Error('Unsupported file format. Use SVG, PNG, or JPG.');
  }

  // Upload to storage
  const fileId = crypto.randomUUID();
  const storagePath = `${tenantId}/${fileId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('pictograms')
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('pictograms')
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  // Insert DB record
  const id = crypto.randomUUID();
  const { data: session } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from('tenant_pictograms')
    .insert({
      id,
      tenant_id: tenantId,
      name: metadata.name,
      description: metadata.description || '',
      category: metadata.category || 'custom',
      regulation_year: metadata.regulationYear || '',
      file_url: fileUrl,
      file_type: ext,
      file_size: file.size,
      tags: metadata.tags || [],
      uploaded_by: session?.session?.user?.id || null,
    })
    .select()
    .single();

  if (error) {
    // Cleanup storage on DB insert failure
    await supabase.storage.from('pictograms').remove([storagePath]);
    throw error;
  }

  return transformTenantPictogram(data);
}

export async function updateTenantPictogram(
  id: string,
  updates: {
    name?: string;
    description?: string;
    category?: string;
    regulationYear?: string;
    tags?: string[];
  }
): Promise<TenantPictogram> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.regulationYear !== undefined) payload.regulation_year = updates.regulationYear;
  if (updates.tags !== undefined) payload.tags = updates.tags;

  const { data, error } = await supabase
    .from('tenant_pictograms')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return transformTenantPictogram(data);
}

export async function deleteTenantPictogram(id: string): Promise<void> {
  // Get the record first to find the storage path
  const { data: pic, error: fetchError } = await supabase
    .from('tenant_pictograms')
    .select('file_url, tenant_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Extract storage path from URL
  if (pic?.file_url) {
    const url = new URL(pic.file_url);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/pictograms\/(.+)/);
    if (pathMatch) {
      await supabase.storage.from('pictograms').remove([pathMatch[1]]);
    }
  }

  // Delete DB row
  const { error } = await supabase
    .from('tenant_pictograms')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
