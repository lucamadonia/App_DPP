/**
 * Supabase Canned Responses Service
 *
 * Stores canned responses in tenants.settings.returnsHub.cannedResponses
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhCannedResponse } from '@/types/returns-hub';

export async function getCannedResponses(): Promise<RhCannedResponse[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (error || !data?.settings?.returnsHub?.cannedResponses) {
    return [];
  }

  return data.settings.returnsHub.cannedResponses as RhCannedResponse[];
}

export async function saveCannedResponses(
  responses: RhCannedResponse[]
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  const currentRh = currentSettings.returnsHub || {};

  const newSettings = {
    ...currentSettings,
    returnsHub: {
      ...currentRh,
      cannedResponses: responses,
    },
  };

  const { error } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (error) {
    console.error('Failed to save canned responses:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
