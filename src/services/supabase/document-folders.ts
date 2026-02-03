/**
 * Supabase Document Folders Service
 *
 * CRUD for user-defined document folders
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { DocumentFolder } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFolder(row: any): DocumentFolder {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    parentId: row.parent_id || undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * Get all folders for current tenant
 */
export async function getDocumentFolders(): Promise<DocumentFolder[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load document folders:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformFolder(row));
}

/**
 * Create a new folder
 */
export async function createDocumentFolder(
  name: string,
  parentId?: string
): Promise<{ success: boolean; folder?: DocumentFolder; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data, error } = await supabase
    .from('document_folders')
    .insert({
      tenant_id: tenantId,
      name,
      parent_id: parentId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create folder:', error);
    return { success: false, error: error.message };
  }

  return { success: true, folder: transformFolder(data) };
}

/**
 * Rename a folder
 */
export async function renameDocumentFolder(
  id: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('document_folders')
    .update({ name })
    .eq('id', id);

  if (error) {
    console.error('Failed to rename folder:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a folder (documents keep their records, folder_id becomes NULL via ON DELETE SET NULL)
 */
export async function deleteDocumentFolder(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('document_folders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete folder:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Move a document into a folder
 */
export async function moveDocumentToFolder(
  docId: string,
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('documents')
    .update({ folder_id: folderId })
    .eq('id', docId);

  if (error) {
    console.error('Failed to move document to folder:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a document from its folder (set folder_id to NULL)
 */
export async function removeDocumentFromFolder(
  docId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('documents')
    .update({ folder_id: null })
    .eq('id', docId);

  if (error) {
    console.error('Failed to remove document from folder:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
