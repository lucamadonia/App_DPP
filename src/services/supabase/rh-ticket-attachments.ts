/**
 * Supabase Ticket Attachments Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';

export async function uploadTicketAttachment(
  file: File,
  ticketId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const ext = file.name.split('.').pop() || 'bin';
  const path = `${tenantId}/tickets/${ticketId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error('Failed to upload ticket attachment:', error);
    return { success: false, error: error.message };
  }

  return { success: true, path };
}

export async function getTicketAttachmentUrl(
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    console.error('Failed to get ticket attachment URL:', error);
    return null;
  }

  return data.signedUrl;
}
