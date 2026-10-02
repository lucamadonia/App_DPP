/**
 * Supabase Visibility Service
 *
 * Verwaltet die Sichtbarkeitseinstellungen für DPP-Felder
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { getPublicDppProduct } from './products';
import type { VisibilityConfigV2, VisibilityConfigV3, FieldVisibilityConfig } from '@/types/visibility';
import { defaultVisibilityConfigV2, defaultVisibilityConfigV3, migrateVisibilityV2toV3 } from '@/types/visibility';

// Transform database row to VisibilityConfigV2 or V3 type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformVisibilitySettings(row: any): VisibilityConfigV2 | VisibilityConfigV3 {
  const version = row.version || 2;

  if (version === 3) {
    return {
      id: row.id,
      version: 3,
      fields: { ...defaultVisibilityConfigV3.fields, ...row.fields },
    };
  }

  // V2 format
  return {
    id: row.id,
    version: 2,
    fields: { ...defaultVisibilityConfigV2.fields, ...(row.fields as FieldVisibilityConfig) },
  };
}

/**
 * Get visibility settings for the current tenant
 * If productId is provided, returns product-specific settings
 * Otherwise returns tenant-wide default settings
 * Auto-migrates V2 to V3 when loading
 */
export async function getVisibilitySettings(productId?: string): Promise<VisibilityConfigV3> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    console.warn('No tenant set - returning default visibility settings');
    return defaultVisibilityConfigV3;
  }

  // First try to get product-specific settings if productId is provided
  if (productId) {
    const { data: productSettings, error: productError } = await supabase
      .from('visibility_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('product_id', productId)
      .single();

    if (!productError && productSettings) {
      const config = transformVisibilitySettings(productSettings);
      // Auto-migrate V2 to V3
      if (config.version === 2) {
        return migrateVisibilityV2toV3(config as VisibilityConfigV2);
      }
      return config as VisibilityConfigV3;
    }
  }

  // Fall back to tenant-wide settings (where product_id is null)
  const { data: tenantSettings, error: tenantError } = await supabase
    .from('visibility_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('product_id', null)
    .single();

  if (tenantError || !tenantSettings) {
    // Return default settings if no settings found in database
    return defaultVisibilityConfigV3;
  }

  const config = transformVisibilitySettings(tenantSettings);
  // Auto-migrate V2 to V3
  if (config.version === 2) {
    return migrateVisibilityV2toV3(config as VisibilityConfigV2);
  }
  return config as VisibilityConfigV3;
}

/**
 * Save visibility settings (V3 format)
 * If productId is provided, saves product-specific settings
 * Otherwise saves tenant-wide default settings
 */
export async function saveVisibilitySettings(
  config: VisibilityConfigV3,
  productId?: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const settingsData = {
    tenant_id: tenantId,
    product_id: productId || null,
    version: 3,
    fields: config.fields,
    updated_at: new Date().toISOString(),
  };

  // Check if settings already exist
  let query = supabase
    .from('visibility_settings')
    .select('id')
    .eq('tenant_id', tenantId);

  if (productId) {
    query = query.eq('product_id', productId);
  } else {
    query = query.is('product_id', null);
  }

  const { data: existing } = await query.single();

  if (existing) {
    // Update existing settings
    const { error } = await supabase
      .from('visibility_settings')
      .update(settingsData)
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update visibility settings:', error);
      return { success: false, error: error.message };
    }
  } else {
    // Create new settings
    const { error } = await supabase
      .from('visibility_settings')
      .insert(settingsData);

    if (error) {
      console.error('Failed to create visibility settings:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}

/**
 * Delete product-specific visibility settings
 * This will cause the product to use tenant-wide defaults
 */
export async function deleteProductVisibilitySettings(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const { error } = await supabase
    .from('visibility_settings')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('product_id', productId);

  if (error) {
    console.error('Failed to delete product visibility settings:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Copy tenant-wide settings to a specific product
 */
export async function copyVisibilitySettingsToProduct(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  const tenantSettings = await getVisibilitySettings();
  return saveVisibilitySettings(tenantSettings, productId);
}

/**
 * Get visibility settings for a public product view (by GTIN/Serial).
 * Resolved server-side by get_public_dpp_product (migration 20261001i):
 * product row -> tenant row -> defaults, V2 auto-migrated to V3. Public code
 * never reads visibility_settings directly (no anon access after stage 2).
 */
export async function getPublicVisibilitySettings(
  gtin: string,
  serial: string
): Promise<VisibilityConfigV3> {
  const result = await getPublicDppProduct(gtin, serial, 'consumer');
  return result?.visibility ?? defaultVisibilityConfigV3;
}
