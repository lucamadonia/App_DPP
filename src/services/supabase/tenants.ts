/**
 * Supabase Tenants Service
 *
 * CRUD-Operationen für Mandanten (Tenants) mit RLS (Row Level Security)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Tenant, TenantSettings, BrandingSettings, QRCodeDomainSettings, DPPDesignSettings } from '@/types/database';

// Transform database row to Tenant type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTenant(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo || undefined,
    address: row.address || undefined,
    country: row.country || undefined,
    eori: row.eori || undefined,
    vat: row.vat || undefined,
    settings: row.settings as TenantSettings | undefined,
    plan: row.plan || 'free',
    createdAt: row.created_at,
  };
}

/**
 * Get a tenant by ID
 */
export async function getTenant(id: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Failed to load tenant:', error);
    return null;
  }

  return transformTenant(data);
}

/**
 * Get the current user's tenant
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    console.warn('No tenant set - cannot load tenant');
    return null;
  }

  return getTenant(tenantId);
}

/**
 * Update a tenant
 */
export async function updateTenant(
  id: string,
  data: Partial<Omit<Tenant, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.logo !== undefined) updateData.logo = data.logo || null;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.country !== undefined) updateData.country = data.country || null;
  if (data.eori !== undefined) updateData.eori = data.eori || null;
  if (data.vat !== undefined) updateData.vat = data.vat || null;
  if (data.settings !== undefined) updateData.settings = data.settings || null;
  if (data.plan !== undefined) updateData.plan = data.plan;

  const { error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update tenant:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update the current user's tenant
 */
export async function updateCurrentTenant(
  data: Partial<Omit<Tenant, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  return updateTenant(tenantId, data);
}

/**
 * Update tenant settings
 */
export async function updateTenantSettings(
  settings: Partial<TenantSettings>
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // First get current settings
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }

  // Merge settings
  const mergedSettings: TenantSettings = {
    ...tenant.settings,
    ...settings,
  };

  return updateTenant(tenantId, { settings: mergedSettings });
}

// ============================================
// BRANDING FUNCTIONS
// ============================================

/**
 * Get branding settings for the current tenant
 */
export async function getTenantBranding(): Promise<BrandingSettings | null> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return null;
  }
  return tenant.settings?.branding || null;
}

/**
 * Update branding settings for the current tenant
 */
export async function updateTenantBranding(
  branding: Partial<BrandingSettings>
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const tenant = await getTenant(tenantId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }

  // Merge branding into existing settings
  const mergedSettings: TenantSettings = {
    ...tenant.settings,
    branding: {
      ...tenant.settings?.branding,
      ...branding,
    },
  };

  return updateTenant(tenantId, { settings: mergedSettings });
}

/**
 * Get QR code domain settings for the current tenant
 */
export async function getQRCodeSettings(): Promise<QRCodeDomainSettings | null> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return null;
  }
  return tenant.settings?.qrCode || null;
}

/**
 * Update QR code domain settings for the current tenant
 */
export async function updateQRCodeSettings(
  qrSettings: Partial<QRCodeDomainSettings>
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const tenant = await getTenant(tenantId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }

  // Merge QR settings into existing settings
  const mergedSettings: TenantSettings = {
    ...tenant.settings,
    qrCode: {
      ...tenant.settings?.qrCode,
      ...qrSettings,
    },
  };

  return updateTenant(tenantId, { settings: mergedSettings });
}

/**
 * Upload a branding asset (logo or favicon) to Supabase Storage
 */
export async function uploadBrandingAsset(
  file: File,
  type: 'logo' | 'favicon'
): Promise<{ success: boolean; url?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // Validate file type
  const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Ungültiger Dateityp. Erlaubt: PNG, JPG, SVG, ICO' };
  }

  // Validate file size (max 2MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: 'Datei zu groß. Maximal 2MB erlaubt.' };
  }

  // Generate unique filename
  const ext = file.name.split('.').pop();
  const filename = `${tenantId}/${type}-${Date.now()}.${ext}`;

  // Verify bucket exists by attempting to list (helps diagnose missing bucket)
  const { error: bucketCheckError } = await supabase.storage
    .from('branding')
    .list(tenantId, { limit: 1 });

  if (bucketCheckError) {
    console.error('Branding bucket check failed:', bucketCheckError);
    const hint = bucketCheckError.message?.includes('not found')
      ? 'Der Storage-Bucket "branding" existiert nicht. Bitte führen Sie supabase/storage.sql im SQL Editor aus.'
      : `Bucket-Zugriff fehlgeschlagen: ${bucketCheckError.message}`;
    return { success: false, error: hint };
  }

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Branding upload error:', uploadError);
    let errorMsg = uploadError.message;
    if (uploadError.message?.includes('Bucket not found')) {
      errorMsg = 'Storage-Bucket "branding" nicht gefunden. Bitte supabase/storage.sql ausführen.';
    } else if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
      errorMsg = 'Keine Upload-Berechtigung. Bitte Storage-Policies in supabase/storage.sql prüfen.';
    }
    return { success: false, error: errorMsg };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(filename);

  const publicUrl = urlData.publicUrl;

  // Update tenant branding with the new URL
  const brandingUpdate: Partial<BrandingSettings> = {};
  if (type === 'logo') {
    brandingUpdate.logo = publicUrl;
  } else {
    brandingUpdate.favicon = publicUrl;
  }

  const updateResult = await updateTenantBranding(brandingUpdate);
  if (!updateResult.success) {
    return { success: false, error: updateResult.error };
  }

  return { success: true, url: publicUrl };
}

/**
 * Get branding settings for a specific tenant (for public pages)
 * This doesn't require authentication
 */
export async function getPublicTenantBranding(tenantId: string): Promise<BrandingSettings | null> {
  if (!tenantId) {
    return null;
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('settings, name, logo')
    .eq('id', tenantId)
    .single();

  if (error || !data) {
    console.error('Failed to load public tenant branding:', error);
    return null;
  }

  // Combine tenant fields with branding settings
  const settings = data.settings as TenantSettings | null;
  const branding: BrandingSettings = {
    ...settings?.branding,
    // Use tenant.name as fallback for appName
    appName: settings?.branding?.appName || data.name || 'Trackbliss',
    // Use tenant.logo as fallback
    logo: settings?.branding?.logo || data.logo,
  };

  return branding;
}

/**
 * Get branding for a product's tenant (for public pages)
 * Finds the tenant based on GTIN/Serial
 */
export async function getPublicBrandingByProduct(
  gtin: string,
  serial: string
): Promise<BrandingSettings | null> {
  // First find the product to get its tenant_id
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('tenant_id')
    .eq('gtin', gtin)
    .eq('serial_number', serial)
    .single();

  if (productError || !product) {
    console.error('Failed to find product for branding:', productError);
    return null;
  }

  return getPublicTenantBranding(product.tenant_id);
}

/**
 * Get QR code settings for a product's tenant (for public pages)
 * Returns the dppTemplate and other QR settings
 * Uses two-step lookup: find product by GTIN, then batch by serial_number
 */
export async function getPublicTenantQRSettings(
  gtin: string,
  serial: string
): Promise<QRCodeDomainSettings | null> {
  try {
    // Step 1: Find products by GTIN
    const { data: productRows } = await supabase
      .from('products')
      .select('id, tenant_id')
      .eq('gtin', gtin);

    if (!productRows || productRows.length === 0) {
      return null;
    }

    let tenantId: string | null = null;

    // Step 2: Try to find a batch with the given serial number
    for (const row of productRows) {
      const { data: batchRow } = await supabase
        .from('product_batches')
        .select('id')
        .eq('product_id', row.id)
        .eq('serial_number', serial)
        .single();

      if (batchRow) {
        tenantId = row.tenant_id;
        break;
      }
    }

    // Fallback: legacy lookup (serial_number on products table)
    if (!tenantId) {
      const legacyProduct = productRows.find(
        (p) => (p as unknown as { serial_number?: string }).serial_number === serial
      );
      if (legacyProduct) {
        tenantId = legacyProduct.tenant_id;
      }
    }

    if (!tenantId) {
      return null;
    }

    // Step 3: Fetch tenant settings
    const { data, error } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      console.error('Error fetching tenant QR settings:', error);
      return null;
    }

    const settings = data.settings as TenantSettings | null;
    return settings?.qrCode || null;
  } catch (error) {
    console.error('Error in getPublicTenantQRSettings:', error);
    return null;
  }
}

// ============================================
// DPP DESIGN FUNCTIONS
// ============================================

/**
 * Get DPP design settings for the current tenant
 */
export async function getDPPDesignSettings(): Promise<DPPDesignSettings | null> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return null;
  }
  return tenant.settings?.dppDesign || null;
}

/**
 * Update DPP design settings for the current tenant (merge-update)
 */
export async function updateDPPDesignSettings(
  design: Partial<DPPDesignSettings>
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const tenant = await getTenant(tenantId);
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }

  const mergedSettings: TenantSettings = {
    ...tenant.settings,
    dppDesign: {
      ...tenant.settings?.dppDesign,
      ...design,
      colors: {
        ...tenant.settings?.dppDesign?.colors,
        ...design.colors,
      },
      typography: {
        ...tenant.settings?.dppDesign?.typography,
        ...design.typography,
      },
      hero: {
        ...tenant.settings?.dppDesign?.hero,
        ...design.hero,
      },
      cards: {
        ...tenant.settings?.dppDesign?.cards,
        ...design.cards,
      },
      sections: {
        ...tenant.settings?.dppDesign?.sections,
        ...design.sections,
      },
      footer: {
        ...tenant.settings?.dppDesign?.footer,
        ...design.footer,
        socialLinks: {
          ...tenant.settings?.dppDesign?.footer?.socialLinks,
          ...design.footer?.socialLinks,
        },
      },
    },
  };

  return updateTenant(tenantId, { settings: mergedSettings });
}

/**
 * Get DPP design settings for a product's tenant (for public pages)
 * Uses two-step lookup: find product by GTIN, then batch by serial_number
 */
export async function getPublicTenantDPPDesign(
  gtin: string,
  serial: string
): Promise<DPPDesignSettings | null> {
  try {
    // Step 1: Find products by GTIN
    const { data: productRows } = await supabase
      .from('products')
      .select('id, tenant_id')
      .eq('gtin', gtin);

    if (!productRows || productRows.length === 0) {
      return null;
    }

    let tenantId: string | null = null;

    // Step 2: Try to find a batch with the given serial number
    for (const row of productRows) {
      const { data: batchRow } = await supabase
        .from('product_batches')
        .select('id')
        .eq('product_id', row.id)
        .eq('serial_number', serial)
        .single();

      if (batchRow) {
        tenantId = row.tenant_id;
        break;
      }
    }

    // Fallback: legacy lookup (serial_number on products table)
    if (!tenantId) {
      const legacyProduct = productRows.find(
        (p) => (p as unknown as { serial_number?: string }).serial_number === serial
      );
      if (legacyProduct) {
        tenantId = legacyProduct.tenant_id;
      }
    }

    if (!tenantId) {
      return null;
    }

    // Step 3: Fetch tenant DPP design settings
    const { data, error } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      console.error('Error fetching tenant DPP design:', error);
      return null;
    }

    const settings = data.settings as TenantSettings | null;
    return settings?.dppDesign || null;
  } catch (error) {
    console.error('Error in getPublicTenantDPPDesign:', error);
    return null;
  }
}

/**
 * Upload a hero image for DPP public pages
 */
export async function uploadHeroImage(
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Allowed: PNG, JPG, WebP' };
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, error: 'File too large. Maximum 2MB allowed.' };
  }

  const ext = file.name.split('.').pop();
  const filename = `${tenantId}/hero-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('branding')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('Hero image upload error:', uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from('branding')
    .getPublicUrl(filename);

  return { success: true, url: urlData.publicUrl };
}
