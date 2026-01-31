/**
 * Supabase Return Photos Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';

export async function uploadReturnPhoto(
  file: File,
  returnId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${tenantId}/return-${returnId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('return-photos')
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error('Failed to upload return photo:', error);
    return { success: false, error: error.message };
  }

  return { success: true, path };
}

export async function getReturnPhotoUrl(
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('return-photos')
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    console.error('Failed to get return photo URL:', error);
    return null;
  }

  return data.signedUrl;
}
