/**
 * Supabase Visibility Service
 *
 * Verwaltet die Sichtbarkeitseinstellungen für DPP-Felder
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { VisibilityConfigV2, FieldVisibilityConfig } from '@/types/visibility';
import { defaultVisibilityConfigV2 } from '@/types/visibility';

// Transform database row to VisibilityConfigV2 type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformVisibilitySettings(row: any): VisibilityConfigV2 {
  return {
    id: row.id,
    version: row.version || 2,
    fields: (row.fields as FieldVisibilityConfig) || defaultVisibilityConfigV2.fields,
  };
}

/**
 * Get visibility settings for the current tenant
 * If productId is provided, returns product-specific settings
 * Otherwise returns tenant-wide default settings
 */
export async function getVisibilitySettings(productId?: string): Promise<VisibilityConfigV2> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    console.warn('No tenant set - returning default visibility settings');
    return defaultVisibilityConfigV2;
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
      return transformVisibilitySettings(productSettings);
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
    return defaultVisibilityConfigV2;
  }

  return transformVisibilitySettings(tenantSettings);
}

/**
 * Save visibility settings
 * If productId is provided, saves product-specific settings
 * Otherwise saves tenant-wide default settings
 */
export async function saveVisibilitySettings(
  config: VisibilityConfigV2,
  productId?: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const settingsData = {
    tenant_id: tenantId,
    product_id: productId || null,
    version: config.version || 2,
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
 * Get visibility settings for a public product view (by GTIN/Serial)
 * This bypasses tenant check since it's for public access
 */
export async function getPublicVisibilitySettings(
  gtin: string,
  serial: string
): Promise<VisibilityConfigV2> {
  // First get the product to find the tenant
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, tenant_id')
    .eq('gtin', gtin)
    .eq('serial_number', serial)
    .single();

  if (productError || !product) {
    return defaultVisibilityConfigV2;
  }

  // Try product-specific settings first
  const { data: productSettings } = await supabase
    .from('visibility_settings')
    .select('*')
    .eq('tenant_id', product.tenant_id)
    .eq('product_id', product.id)
    .single();

  if (productSettings) {
    return transformVisibilitySettings(productSettings);
  }

  // Fall back to tenant settings
  const { data: tenantSettings } = await supabase
    .from('visibility_settings')
    .select('*')
    .eq('tenant_id', product.tenant_id)
    .is('product_id', null)
    .single();

  if (tenantSettings) {
    return transformVisibilitySettings(tenantSettings);
  }

  return defaultVisibilityConfigV2;
}
