/**
 * Supabase Returns Hub Settings Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { ReturnsHubSettings, RhReturnReason } from '@/types/returns-hub';

const DEFAULT_SETTINGS: ReturnsHubSettings = {
  enabled: false,
  plan: 'starter',
  prefix: 'RET',
  maxReturnsPerMonth: 50,
  maxAdminUsers: 2,
  features: {
    customBranding: false,
    customHtmlCss: false,
    whitelabelDomain: false,
    crmTickets: false,
    apiAccess: 'none',
    webhooks: false,
    customsIntegration: false,
    workflowRules: false,
  },
  usage: {
    returnsThisMonth: 0,
    lastResetAt: new Date().toISOString(),
  },
  branding: {
    primaryColor: '#3B82F6',
    logoUrl: '',
    customCss: '',
    customHtml: {},
  },
};

export async function getReturnsHubSettings(): Promise<ReturnsHubSettings> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ...DEFAULT_SETTINGS };

  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (error || !data?.settings?.returnsHub) {
    return { ...DEFAULT_SETTINGS };
  }

  return { ...DEFAULT_SETTINGS, ...data.settings.returnsHub };
}

export async function updateReturnsHubSettings(
  updates: Partial<ReturnsHubSettings>
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // Get current settings
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  const currentRh = currentSettings.returnsHub || DEFAULT_SETTINGS;

  const newSettings = {
    ...currentSettings,
    returnsHub: {
      ...currentRh,
      ...updates,
      features: updates.features ? { ...currentRh.features, ...updates.features } : currentRh.features,
      usage: updates.usage ? { ...currentRh.usage, ...updates.usage } : currentRh.usage,
      branding: updates.branding ? { ...currentRh.branding, ...updates.branding } : currentRh.branding,
    },
  };

  const { error } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (error) {
    console.error('Failed to update returns hub settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// RETURN REASONS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformReturnReason(row: any): RhReturnReason {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    category: row.category,
    subcategories: row.subcategories || [],
    followUpQuestions: row.follow_up_questions || [],
    requiresPhotos: row.requires_photos || false,
    sortOrder: row.sort_order || 0,
    active: row.active ?? true,
    createdAt: row.created_at,
  };
}

export async function getReturnReasons(): Promise<RhReturnReason[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('rh_return_reasons')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order');

  if (error) {
    console.error('Failed to load return reasons:', error);
    return [];
  }

  return (data || []).map((row: any) => transformReturnReason(row));
}

export async function createReturnReason(
  reason: Omit<RhReturnReason, 'id' | 'tenantId' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data, error } = await supabase
    .from('rh_return_reasons')
    .insert({
      tenant_id: tenantId,
      category: reason.category,
      subcategories: reason.subcategories || [],
      follow_up_questions: reason.followUpQuestions || [],
      requires_photos: reason.requiresPhotos || false,
      sort_order: reason.sortOrder || 0,
      active: reason.active ?? true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create return reason:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function updateReturnReason(
  id: string,
  updates: Partial<RhReturnReason>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {};

  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.subcategories !== undefined) updateData.subcategories = updates.subcategories;
  if (updates.followUpQuestions !== undefined) updateData.follow_up_questions = updates.followUpQuestions;
  if (updates.requiresPhotos !== undefined) updateData.requires_photos = updates.requiresPhotos;
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;
  if (updates.active !== undefined) updateData.active = updates.active;

  const { error } = await supabase
    .from('rh_return_reasons')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update return reason:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteReturnReason(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('rh_return_reasons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete return reason:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Public access (no auth needed) - for public return registration
export async function getPublicReturnReasons(tenantSlug: string): Promise<RhReturnReason[]> {
  // First get tenant id from slug
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single();

  if (!tenant) return [];

  const { data, error } = await supabase
    .from('rh_return_reasons')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('sort_order');

  if (error) {
    console.error('Failed to load public return reasons:', error);
    return [];
  }

  return (data || []).map((row: any) => transformReturnReason(row));
}
