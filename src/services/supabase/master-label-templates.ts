/**
 * Master Label Template Service
 *
 * Templates are stored in tenants.settings.masterLabelTemplates[] (JSONB).
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { MasterLabelTemplate } from '@/types/master-label-editor';

/**
 * Get all saved custom templates for the current tenant.
 */
export async function getMasterLabelTemplates(): Promise<MasterLabelTemplate[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (error || !data?.settings) return [];

  const settings = data.settings as Record<string, unknown>;
  return (settings.masterLabelTemplates as MasterLabelTemplate[] | undefined) || [];
}

/**
 * Save or update a custom template.
 * If a template with the same ID exists, it's replaced; otherwise, it's appended.
 */
export async function saveMasterLabelTemplate(
  template: MasterLabelTemplate,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant found' };

  // Load current settings
  const { data, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };

  const settings = (data?.settings || {}) as Record<string, unknown>;
  const existing = (settings.masterLabelTemplates as MasterLabelTemplate[] | undefined) || [];

  // Replace or append
  const idx = existing.findIndex(t => t.id === template.id);
  const updated = [...existing];
  if (idx >= 0) {
    updated[idx] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    updated.push({
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: { ...settings, masterLabelTemplates: updated } })
    .eq('id', tenantId);

  if (updateError) return { success: false, error: updateError.message };
  return { success: true };
}

/**
 * Delete a custom template by ID.
 */
export async function deleteMasterLabelTemplate(
  templateId: string,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant found' };

  const { data, error: fetchError } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (fetchError) return { success: false, error: fetchError.message };

  const settings = (data?.settings || {}) as Record<string, unknown>;
  const existing = (settings.masterLabelTemplates as MasterLabelTemplate[] | undefined) || [];
  const filtered = existing.filter(t => t.id !== templateId);

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ settings: { ...settings, masterLabelTemplates: filtered } })
    .eq('id', tenantId);

  if (updateError) return { success: false, error: updateError.message };
  return { success: true };
}
