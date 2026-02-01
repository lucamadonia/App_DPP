/**
 * Supabase Products Service
 *
 * CRUD-Operationen für Produkte mit RLS (Row Level Security)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Product, Material, Certification, CarbonFootprint, RecyclabilityInfo, SupplyChainEntry } from '@/types/product';
import type { ProductRegistrations, SupportResources } from '@/types/database';

// Transform database row to Product type (master data only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer,
    gtin: row.gtin,
    serialNumber: row.serial_number || '',
    productionDate: row.production_date || '',
    expirationDate: row.expiration_date || undefined,
    category: row.category,
    description: row.description,
    materials: (row.materials as Material[]) || [],
    certifications: (row.certifications as Certification[]) || [],
    carbonFootprint: row.carbon_footprint as CarbonFootprint | undefined,
    recyclability: (row.recyclability as RecyclabilityInfo) || {
      recyclablePercentage: 0,
      instructions: '',
      disposalMethods: [],
    },
    supplyChain: [], // Loaded separately from supply_chain_entries
    imageUrl: row.image_url || undefined,
    hsCode: row.hs_code || undefined,
    batchNumber: row.batch_number || undefined,
    countryOfOrigin: row.country_of_origin || undefined,
    netWeight: row.net_weight || undefined,
    grossWeight: row.gross_weight || undefined,
    manufacturerAddress: row.manufacturer_address || undefined,
    manufacturerEORI: row.manufacturer_eori || undefined,
    manufacturerVAT: row.manufacturer_vat || undefined,
    registrations: (row.registrations as ProductRegistrations) || undefined,
    supportResources: (row.support_resources as SupportResources) || undefined,
  };
}

/**
 * Merge product master data with batch data.
 * Batch overrides take precedence when not null/undefined.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeProductWithBatch(product: Product, batch: any): Product {
  return {
    ...product,
    serialNumber: batch.serial_number || product.serialNumber,
    productionDate: batch.production_date || product.productionDate,
    expirationDate: batch.expiration_date || product.expirationDate,
    batchNumber: batch.batch_number || product.batchNumber,
    netWeight: batch.net_weight != null ? Number(batch.net_weight) : product.netWeight,
    grossWeight: batch.gross_weight != null ? Number(batch.gross_weight) : product.grossWeight,
    // Override fields: batch override wins if present
    description: batch.description_override || product.description,
    materials: batch.materials_override || product.materials,
    certifications: batch.certifications_override || product.certifications,
    carbonFootprint: batch.carbon_footprint_override || product.carbonFootprint,
    recyclability: batch.recyclability_override || product.recyclability,
  };
}

/**
 * Enrich product.imageUrl from product_images table if the legacy field is empty.
 * Picks the primary image first, otherwise the first image by sort_order.
 */
async function enrichImageUrl(product: Product, productId: string): Promise<void> {
  if (product.imageUrl) return;

  const { data: images } = await supabase
    .from('product_images')
    .select('url, is_primary')
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(1);

  if (images && images.length > 0) {
    product.imageUrl = images[0].url;
  }
}

export interface ProductListItem {
  id: string;
  name: string;
  manufacturer: string;
  gtin: string;
  serial: string;
  serialNumber?: string;
  category: string;
  imageUrl?: string;
  batch?: string;
  batchCount: number;
  status?: 'draft' | 'live' | 'archived';
  createdAt?: string;
}

/**
 * Get all products for the current tenant
 */
export async function getProducts(search?: string): Promise<ProductListItem[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    console.warn('No tenant set - cannot load products');
    return [];
  }

  let query = supabase
    .from('products')
    .select('*, product_batches(id)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,gtin.ilike.%${search}%,manufacturer.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load products:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    manufacturer: p.manufacturer,
    gtin: p.gtin,
    serial: p.serial_number || '',
    serialNumber: p.serial_number || '',
    category: p.category,
    imageUrl: p.image_url || undefined,
    batch: p.batch_number || undefined,
    batchCount: Array.isArray(p.product_batches) ? p.product_batches.length : 0,
    status: p.status || 'draft',
    createdAt: p.created_at,
  }));
}

/**
 * Get a product by GTIN and serial number (for public DPP view)
 * Two-step lookup: find product by GTIN, then batch by serial_number, then merge.
 * Falls back to legacy direct product lookup for backwards compatibility.
 */
export async function getProductByGtinSerial(
  gtin: string,
  serial: string
): Promise<Product | null> {
  // Step 1: Find the product by GTIN
  const { data: productRows, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('gtin', gtin);

  if (productError || !productRows || productRows.length === 0) {
    return null;
  }

  // Step 2: Try to find a batch with the given serial number
  for (const productRow of productRows) {
    const { data: batchRow } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_id', productRow.id)
      .eq('serial_number', serial)
      .single();

    if (batchRow) {
      // Found batch - merge product + batch
      const product = transformProduct(productRow);
      const merged = mergeProductWithBatch(product, batchRow);

      // Load supply chain entries (product-level + batch-level)
      const { data: supplyChain } = await supabase
        .from('supply_chain_entries')
        .select('*')
        .eq('product_id', productRow.id)
        .order('step', { ascending: true });

      if (supplyChain) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        merged.supplyChain = supplyChain.map((sc: any) => ({
          step: sc.step,
          location: sc.location,
          country: sc.country,
          date: sc.date,
          description: sc.description,
          processType: sc.process_type || undefined,
          transportMode: sc.transport_mode || undefined,
          status: sc.status || undefined,
          emissionsKg: sc.emissions_kg != null ? Number(sc.emissions_kg) : undefined,
        }));
      }

      await enrichImageUrl(merged, productRow.id);
      return merged;
    }
  }

  // Fallback: legacy lookup (product has serial_number directly)
  const legacyRow = productRows.find(p => p.serial_number === serial);
  if (legacyRow) {
    const product = transformProduct(legacyRow);

    const { data: supplyChain } = await supabase
      .from('supply_chain_entries')
      .select('*')
      .eq('product_id', legacyRow.id)
      .order('step', { ascending: true });

    if (supplyChain) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      product.supplyChain = supplyChain.map((sc: any) => ({
        step: sc.step,
        location: sc.location,
        country: sc.country,
        date: sc.date,
        description: sc.description,
        processType: sc.process_type || undefined,
        transportMode: sc.transport_mode || undefined,
        status: sc.status || undefined,
        emissionsKg: sc.emissions_kg != null ? Number(sc.emissions_kg) : undefined,
      }));
    }

    await enrichImageUrl(product, legacyRow.id);
    return product;
  }

  return null;
}

/**
 * Get a product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  const product = transformProduct(data);

  // Load supply chain entries
  const { data: supplyChain } = await supabase
    .from('supply_chain_entries')
    .select('*')
    .eq('product_id', id)
    .order('step', { ascending: true });

  if (supplyChain) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    product.supplyChain = supplyChain.map((sc: any) => ({
      step: sc.step,
      location: sc.location,
      country: sc.country,
      date: sc.date,
      description: sc.description,
      processType: sc.process_type || undefined,
      transportMode: sc.transport_mode || undefined,
      status: sc.status || undefined,
      emissionsKg: sc.emissions_kg != null ? Number(sc.emissions_kg) : undefined,
    }));
  }

  return product;
}

/**
 * Create a new product (master data only, no batch-specific fields)
 */
export async function createProduct(
  product: Partial<Product>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const insertData = {
    tenant_id: tenantId,
    status: 'draft',
    name: product.name || '',
    manufacturer: product.manufacturer || '',
    gtin: product.gtin || '',
    serial_number: product.serialNumber || '',
    production_date: product.productionDate || new Date().toISOString(),
    expiration_date: product.expirationDate || null,
    category: product.category || '',
    description: product.description || '',
    materials: product.materials || [],
    certifications: product.certifications || [],
    carbon_footprint: product.carbonFootprint || null,
    recyclability: product.recyclability || {
      recyclablePercentage: 0,
      instructions: '',
      disposalMethods: [],
    },
    image_url: product.imageUrl || null,
    hs_code: product.hsCode || null,
    batch_number: product.batchNumber || null,
    country_of_origin: product.countryOfOrigin || null,
    net_weight: product.netWeight || null,
    gross_weight: product.grossWeight || null,
    manufacturer_address: product.manufacturerAddress || null,
    manufacturer_eori: product.manufacturerEORI || null,
    manufacturer_vat: product.manufacturerVAT || null,
    registrations: product.registrations || {},
    support_resources: product.supportResources || {},
  };

  const { data, error } = await supabase
    .from('products')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create product:', error);
    return { success: false, error: error.message };
  }

  // Create supply chain entries if provided
  if (product.supplyChain && product.supplyChain.length > 0 && data) {
    const supplyChainEntries = product.supplyChain.map((sc: SupplyChainEntry) => ({
      tenant_id: tenantId,
      product_id: data.id,
      step: sc.step,
      location: sc.location,
      country: sc.country,
      date: sc.date,
      description: sc.description,
    }));

    await supabase.from('supply_chain_entries').insert(supplyChainEntries);
  }

  return { success: true, id: data?.id };
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  product: Partial<Product>
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Map fields
  if (product.name !== undefined) updateData.name = product.name;
  if (product.manufacturer !== undefined) updateData.manufacturer = product.manufacturer;
  if (product.gtin !== undefined) updateData.gtin = product.gtin;
  if (product.serialNumber !== undefined) updateData.serial_number = product.serialNumber;
  if (product.productionDate !== undefined) updateData.production_date = product.productionDate;
  if (product.expirationDate !== undefined) updateData.expiration_date = product.expirationDate || null;
  if (product.category !== undefined) updateData.category = product.category;
  if (product.description !== undefined) updateData.description = product.description;
  if (product.materials !== undefined) updateData.materials = product.materials;
  if (product.certifications !== undefined) updateData.certifications = product.certifications;
  if (product.carbonFootprint !== undefined) updateData.carbon_footprint = product.carbonFootprint || null;
  if (product.recyclability !== undefined) updateData.recyclability = product.recyclability;
  if (product.imageUrl !== undefined) updateData.image_url = product.imageUrl || null;
  if (product.hsCode !== undefined) updateData.hs_code = product.hsCode || null;
  if (product.batchNumber !== undefined) updateData.batch_number = product.batchNumber || null;
  if (product.countryOfOrigin !== undefined) updateData.country_of_origin = product.countryOfOrigin || null;
  if (product.netWeight !== undefined) updateData.net_weight = product.netWeight || null;
  if (product.grossWeight !== undefined) updateData.gross_weight = product.grossWeight || null;
  if (product.manufacturerAddress !== undefined) updateData.manufacturer_address = product.manufacturerAddress || null;
  if (product.manufacturerEORI !== undefined) updateData.manufacturer_eori = product.manufacturerEORI || null;
  if (product.manufacturerVAT !== undefined) updateData.manufacturer_vat = product.manufacturerVAT || null;
  if (product.registrations !== undefined) updateData.registrations = product.registrations || {};
  if (product.supportResources !== undefined) updateData.support_resources = product.supportResources || {};

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update product:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  // Delete supply chain entries first
  await supabase
    .from('supply_chain_entries')
    .delete()
    .eq('product_id', id);

  // Batches are CASCADE deleted via FK

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete product:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get product statistics for dashboard
 */
export async function getProductStats(): Promise<{
  total: number;
  totalBatches: number;
  withDpp: number;
  expiringSoon: number;
  byCategory: Record<string, number>;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { total: 0, totalBatches: 0, withDpp: 0, expiringSoon: 0, byCategory: {} };
  }

  // Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, category, expiration_date')
    .eq('tenant_id', tenantId);

  if (error || !products) {
    return { total: 0, totalBatches: 0, withDpp: 0, expiringSoon: 0, byCategory: {} };
  }

  // Get batch count
  const { count: batchCount } = await supabase
    .from('product_batches')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const byCategory: Record<string, number> = {};
  let expiringSoon = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products.forEach((p: any) => {
    // Count by category
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;

    // Count expiring soon
    if (p.expiration_date) {
      const expDate = new Date(p.expiration_date);
      if (expDate <= thirtyDaysFromNow && expDate > now) {
        expiringSoon++;
      }
    }
  });

  return {
    total: products.length,
    totalBatches: batchCount || 0,
    withDpp: batchCount || products.length,
    expiringSoon,
    byCategory,
  };
}
