/**
 * Feedback module settings — stored at `tenants.settings.feedback` (JSONB).
 * Pattern mirrors rh-settings.ts: deep-merge with defaults, atomic update.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { FeedbackSettings } from '@/types/feedback';

export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = {
  enabled: false,
  requireApproval: true,
  allowPhotos: true,
  maxPhotosPerReview: 5,
  showReviewerCity: true,
  defaultExpiryDays: 90,
  aiModerationEnabled: true,
  ideaBoardEnabled: true,
  ideaInviteExpiryDays: 365,
  widget: {
    defaultMode: 'carousel',
    maxReviews: 12,
    showRatingDistribution: true,
    showProductFilter: true,
    cardStyle: 'modern',
  },
  emails: {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(stored: any): FeedbackSettings {
  return {
    ...DEFAULT_FEEDBACK_SETTINGS,
    ...stored,
    widget: { ...DEFAULT_FEEDBACK_SETTINGS.widget, ...(stored?.widget || {}) },
    emails: { ...DEFAULT_FEEDBACK_SETTINGS.emails, ...(stored?.emails || {}) },
  };
}

export async function getFeedbackSettings(): Promise<FeedbackSettings> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { ...DEFAULT_FEEDBACK_SETTINGS };

  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  if (error || !data?.settings?.feedback) {
    return { ...DEFAULT_FEEDBACK_SETTINGS };
  }
  return deepMerge(data.settings.feedback);
}

/**
 * Public lookup — used by the embed widget to know per-tenant widget config
 * without requiring auth. Slug-based.
 */
export async function getFeedbackSettingsByTenantSlug(
  slug: string,
): Promise<FeedbackSettings | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('settings')
    .eq('slug', slug)
    .single();

  if (error || !data?.settings?.feedback) return null;
  return deepMerge(data.settings.feedback);
}

export async function updateFeedbackSettings(
  updates: Partial<FeedbackSettings>,
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  const currentFb: FeedbackSettings = currentSettings.feedback || DEFAULT_FEEDBACK_SETTINGS;

  const newSettings = {
    ...currentSettings,
    feedback: {
      ...currentFb,
      ...updates,
      widget: updates.widget ? { ...currentFb.widget, ...updates.widget } : currentFb.widget,
      emails: updates.emails ? { ...currentFb.emails, ...updates.emails } : currentFb.emails,
    },
  };

  const { error } = await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenantId);

  if (error) {
    console.error('Failed to update feedback settings:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
