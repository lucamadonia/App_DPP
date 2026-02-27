/**
 * Supabase Products Service
 *
 * CRUD-Operationen für Produkte mit RLS (Row Level Security)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Product, ProductBatch, Material, Certification, CarbonFootprint, RecyclabilityInfo, SupplyChainEntry, TranslatableProductFields, AggregationOverrides, PackagingType, SubstanceOfConcern, AuthorizedRepresentative, DppResponsible } from '@/types/product';
import type { ProductRegistrations, SupportResources } from '@/types/database';

// Transform database row to Product type (master data only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProduct(row: any): Product & { tenantId: string } {
  return {
    id: row.id,
    tenantId: row.tenant_id,
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
    translations: (row.translations as Record<string, TranslatableProductFields>) || {},
    manufacturerSupplierId: row.manufacturer_supplier_id || undefined,
    importerSupplierId: row.importer_supplier_id || undefined,
    productType: row.product_type || 'single',
    aggregationOverrides: (row.aggregation_overrides as AggregationOverrides) || {},
    // Dimensions
    productHeightCm: row.product_height_cm != null ? Number(row.product_height_cm) : undefined,
    productWidthCm: row.product_width_cm != null ? Number(row.product_width_cm) : undefined,
    productDepthCm: row.product_depth_cm != null ? Number(row.product_depth_cm) : undefined,
    // Packaging
    packagingType: (row.packaging_type as PackagingType) || undefined,
    packagingDescription: row.packaging_description || undefined,
    packagingHeightCm: row.packaging_height_cm != null ? Number(row.packaging_height_cm) : undefined,
    packagingWidthCm: row.packaging_width_cm != null ? Number(row.packaging_width_cm) : undefined,
    packagingDepthCm: row.packaging_depth_cm != null ? Number(row.packaging_depth_cm) : undefined,
    // ESPR Compliance Fields
    uniqueProductId: row.unique_product_id || undefined,
    importerName: row.importer_name || undefined,
    importerEORI: row.importer_eori || undefined,
    authorizedRepresentative: (row.authorized_representative as AuthorizedRepresentative) || undefined,
    dppResponsible: (row.dpp_responsible as DppResponsible) || undefined,
    substancesOfConcern: (row.substances_of_concern as SubstanceOfConcern[]) || undefined,
    recycledContentPercentage: row.recycled_content_percentage != null ? Number(row.recycled_content_percentage) : undefined,
    energyConsumptionKWh: row.energy_consumption_kwh != null ? Number(row.energy_consumption_kwh) : undefined,
    durabilityYears: row.durability_years != null ? Number(row.durability_years) : undefined,
    repairabilityScore: row.repairability_score != null ? Number(row.repairability_score) : undefined,
    disassemblyInstructions: row.disassembly_instructions || undefined,
    endOfLifeInstructions: row.end_of_life_instructions || undefined,
    euDeclarationOfConformity: row.eu_declaration_of_conformity || undefined,
    testReports: (row.test_reports as string[]) || undefined,
    ceMarking: row.ce_marking || false,
    userManualUrl: row.user_manual_url || undefined,
    safetyInformation: row.safety_information || undefined,
    customsValue: row.customs_value != null ? Number(row.customs_value) : undefined,
    preferenceProof: row.preference_proof || undefined,
    componentDppUrls: (row.component_dpp_urls as string[]) || undefined,
    dppRegistryId: row.dpp_registry_id || undefined,
  };
}

/**
 * Merge product master data with batch data.
 * Batch overrides take precedence when not null/undefined.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeProductWithBatch(product: Product & { tenantId: string }, batch: any): Product & { tenantId: string } {
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
    // Dimensions & Packaging overrides
    productHeightCm: batch.product_height_cm != null ? Number(batch.product_height_cm) : product.productHeightCm,
    productWidthCm: batch.product_width_cm != null ? Number(batch.product_width_cm) : product.productWidthCm,
    productDepthCm: batch.product_depth_cm != null ? Number(batch.product_depth_cm) : product.productDepthCm,
    packagingType: batch.packaging_type || product.packagingType,
    packagingDescription: batch.packaging_description || product.packagingDescription,
    packagingHeightCm: batch.packaging_height_cm != null ? Number(batch.packaging_height_cm) : product.packagingHeightCm,
    packagingWidthCm: batch.packaging_width_cm != null ? Number(batch.packaging_width_cm) : product.packagingWidthCm,
    packagingDepthCm: batch.packaging_depth_cm != null ? Number(batch.packaging_depth_cm) : product.packagingDepthCm,
  };
}

/**
 * Enrich product.imageUrl from product_images table if the legacy field is empty.
 * Picks the primary image first, otherwise the first image by sort_order.
 */
async function enrichImageUrl(product: Product & { tenantId?: string }, productId: string): Promise<void> {
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
  productType?: 'single' | 'set';
  componentCount?: number;
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
    .select('*, product_batches(id), product_components!product_components_parent_product_id_fkey(id)')
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
    productType: p.product_type || 'single',
    componentCount: Array.isArray(p.product_components) ? p.product_components.length : 0,
  }));
}

/**
 * Get multiple products by their IDs in a single query.
 * Used for batch lookups (e.g. stock volume calculation).
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('id', ids);

  if (error || !data) {
    console.error('Failed to load products by IDs:', error);
    return [];
  }

  return data.map(transformProduct);
}

/**
 * Get a product by GTIN and serial number (for public DPP view)
 * Two-step lookup: find product by GTIN, then batch by serial_number, then merge.
 * Falls back to legacy direct product lookup for backwards compatibility.
 */
export async function getProductByGtinSerial(
  gtin: string,
  serial: string
): Promise<(Product & { tenantId: string }) | null> {
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

  // Billing quota check
  const { checkQuota } = await import('./billing');
  const quota = await checkQuota('product', { tenantId });
  if (!quota.allowed) {
    return { success: false, error: `Product limit reached (${quota.current}/${quota.limit}). Please upgrade your plan.` };
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
    translations: product.translations || {},
    manufacturer_supplier_id: product.manufacturerSupplierId || null,
    importer_supplier_id: product.importerSupplierId || null,
    product_type: product.productType || 'single',
    aggregation_overrides: product.aggregationOverrides || {},
    // Dimensions
    product_height_cm: product.productHeightCm ?? null,
    product_width_cm: product.productWidthCm ?? null,
    product_depth_cm: product.productDepthCm ?? null,
    // Packaging
    packaging_type: product.packagingType || null,
    packaging_description: product.packagingDescription || null,
    packaging_height_cm: product.packagingHeightCm ?? null,
    packaging_width_cm: product.packagingWidthCm ?? null,
    packaging_depth_cm: product.packagingDepthCm ?? null,
    // ESPR Compliance Fields
    unique_product_id: product.uniqueProductId || null,
    importer_name: product.importerName || null,
    importer_eori: product.importerEORI || null,
    authorized_representative: product.authorizedRepresentative || null,
    dpp_responsible: product.dppResponsible || null,
    substances_of_concern: product.substancesOfConcern || null,
    recycled_content_percentage: product.recycledContentPercentage ?? null,
    energy_consumption_kwh: product.energyConsumptionKWh ?? null,
    durability_years: product.durabilityYears ?? null,
    repairability_score: product.repairabilityScore ?? null,
    disassembly_instructions: product.disassemblyInstructions || null,
    end_of_life_instructions: product.endOfLifeInstructions || null,
    eu_declaration_of_conformity: product.euDeclarationOfConformity || null,
    test_reports: product.testReports || null,
    ce_marking: product.ceMarking || false,
    user_manual_url: product.userManualUrl || null,
    safety_information: product.safetyInformation || null,
    customs_value: product.customsValue ?? null,
    preference_proof: product.preferenceProof || null,
    component_dpp_urls: product.componentDppUrls || null,
    dpp_registry_id: product.dppRegistryId || null,
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
  if (product.translations !== undefined) updateData.translations = product.translations || {};
  if (product.manufacturerSupplierId !== undefined) updateData.manufacturer_supplier_id = product.manufacturerSupplierId || null;
  if (product.importerSupplierId !== undefined) updateData.importer_supplier_id = product.importerSupplierId || null;
  if (product.productType !== undefined) updateData.product_type = product.productType;
  if (product.aggregationOverrides !== undefined) updateData.aggregation_overrides = product.aggregationOverrides || {};
  // Dimensions
  if (product.productHeightCm !== undefined) updateData.product_height_cm = product.productHeightCm ?? null;
  if (product.productWidthCm !== undefined) updateData.product_width_cm = product.productWidthCm ?? null;
  if (product.productDepthCm !== undefined) updateData.product_depth_cm = product.productDepthCm ?? null;
  // Packaging
  if (product.packagingType !== undefined) updateData.packaging_type = product.packagingType || null;
  if (product.packagingDescription !== undefined) updateData.packaging_description = product.packagingDescription || null;
  if (product.packagingHeightCm !== undefined) updateData.packaging_height_cm = product.packagingHeightCm ?? null;
  if (product.packagingWidthCm !== undefined) updateData.packaging_width_cm = product.packagingWidthCm ?? null;
  if (product.packagingDepthCm !== undefined) updateData.packaging_depth_cm = product.packagingDepthCm ?? null;
  // ESPR Compliance Fields
  if (product.uniqueProductId !== undefined) updateData.unique_product_id = product.uniqueProductId || null;
  if (product.importerName !== undefined) updateData.importer_name = product.importerName || null;
  if (product.importerEORI !== undefined) updateData.importer_eori = product.importerEORI || null;
  if (product.authorizedRepresentative !== undefined) updateData.authorized_representative = product.authorizedRepresentative || null;
  if (product.dppResponsible !== undefined) updateData.dpp_responsible = product.dppResponsible || null;
  if (product.substancesOfConcern !== undefined) updateData.substances_of_concern = product.substancesOfConcern || null;
  if (product.recycledContentPercentage !== undefined) updateData.recycled_content_percentage = product.recycledContentPercentage ?? null;
  if (product.energyConsumptionKWh !== undefined) updateData.energy_consumption_kwh = product.energyConsumptionKWh ?? null;
  if (product.durabilityYears !== undefined) updateData.durability_years = product.durabilityYears ?? null;
  if (product.repairabilityScore !== undefined) updateData.repairability_score = product.repairabilityScore ?? null;
  if (product.disassemblyInstructions !== undefined) updateData.disassembly_instructions = product.disassemblyInstructions || null;
  if (product.endOfLifeInstructions !== undefined) updateData.end_of_life_instructions = product.endOfLifeInstructions || null;
  if (product.euDeclarationOfConformity !== undefined) updateData.eu_declaration_of_conformity = product.euDeclarationOfConformity || null;
  if (product.testReports !== undefined) updateData.test_reports = product.testReports || null;
  if (product.ceMarking !== undefined) updateData.ce_marking = product.ceMarking || false;
  if (product.userManualUrl !== undefined) updateData.user_manual_url = product.userManualUrl || null;
  if (product.safetyInformation !== undefined) updateData.safety_information = product.safetyInformation || null;
  if (product.customsValue !== undefined) updateData.customs_value = product.customsValue ?? null;
  if (product.preferenceProof !== undefined) updateData.preference_proof = product.preferenceProof || null;
  if (product.componentDppUrls !== undefined) updateData.component_dpp_urls = product.componentDppUrls || null;
  if (product.dppRegistryId !== undefined) updateData.dpp_registry_id = product.dppRegistryId || null;

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

// ---------------------------------------------------------------------------
// Duplicate product
// ---------------------------------------------------------------------------

export interface DuplicateProductOptions {
  includeSupplyChain: boolean;
  includeBatches: boolean;
  includeImages: boolean;
  includeDocuments: boolean;
  includeSuppliers: boolean;
}

export async function duplicateProduct(
  sourceId: string,
  options: DuplicateProductOptions,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  // 1. Fetch source product
  const source = await getProductById(sourceId);
  if (!source) return { success: false, error: 'Source product not found' };

  // 2. Create copy with cleared GTIN and draft status
  const result = await createProduct({
    ...source,
    name: `(Copy) ${source.name}`,
    gtin: '',
    supplyChain: [], // handled separately below
  });
  if (!result.success || !result.id) return result;

  const newId = result.id;

  // 3. Supply chain
  if (options.includeSupplyChain && source.supplyChain.length > 0) {
    const entries = source.supplyChain.map((sc: SupplyChainEntry) => ({
      tenant_id: tenantId,
      product_id: newId,
      step: sc.step,
      location: sc.location,
      country: sc.country,
      date: sc.date,
      description: sc.description,
      process_type: sc.processType || null,
      transport_mode: sc.transportMode || null,
      status: sc.status || null,
      emissions_kg: sc.emissionsKg != null ? sc.emissionsKg : null,
    }));
    await supabase.from('supply_chain_entries').insert(entries);
  }

  // 4. Batches (clear serial numbers, status draft)
  if (options.includeBatches) {
    const { data: batches } = await supabase
      .from('product_batches')
      .select('*')
      .eq('product_id', sourceId);

    if (batches && batches.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchInserts = batches.map((b: any) => ({
        tenant_id: tenantId,
        product_id: newId,
        batch_number: b.batch_number || null,
        serial_number: '',
        production_date: b.production_date,
        expiration_date: b.expiration_date || null,
        net_weight: b.net_weight,
        gross_weight: b.gross_weight,
        quantity: b.quantity,
        price_per_unit: b.price_per_unit,
        currency: b.currency,
        supplier_id: b.supplier_id,
        status: 'draft',
        notes: b.notes || null,
        materials_override: b.materials_override,
        certifications_override: b.certifications_override,
        carbon_footprint_override: b.carbon_footprint_override,
        recyclability_override: b.recyclability_override,
        description_override: b.description_override,
      }));
      await supabase.from('product_batches').insert(batchInserts);
    }
  }

  // 5. Images (reference same storage URLs)
  if (options.includeImages) {
    const { data: images } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', sourceId)
      .order('sort_order', { ascending: true });

    if (images && images.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imgInserts = images.map((img: any) => ({
        tenant_id: tenantId,
        product_id: newId,
        url: img.url,
        filename: img.filename,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        caption: img.caption || null,
      }));
      await supabase.from('product_images').insert(imgInserts);
    }
  }

  // 6. Documents (reference same storage URLs)
  if (options.includeDocuments) {
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('product_id', sourceId);

    if (docs && docs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docInserts = docs.map((d: any) => ({
        tenant_id: tenantId,
        product_id: newId,
        name: d.name,
        category: d.category,
        file_url: d.file_url,
        file_name: d.file_name,
        file_size: d.file_size,
        mime_type: d.mime_type,
        visibility: d.visibility,
        valid_until: d.valid_until || null,
      }));
      await supabase.from('documents').insert(docInserts);
    }
  }

  // 7. Supplier assignments
  if (options.includeSuppliers) {
    const { data: sps } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('product_id', sourceId);

    if (sps && sps.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spInserts = sps.map((sp: any) => ({
        tenant_id: tenantId,
        product_id: newId,
        supplier_id: sp.supplier_id,
        role: sp.role,
        is_primary: sp.is_primary,
        lead_time_days: sp.lead_time_days,
        price_tiers: sp.price_tiers || null,
      }));
      await supabase.from('supplier_products').insert(spInserts);
    }
  }

  return { success: true, id: newId };
}

// ---------------------------------------------------------------------------
// Get entity counts for duplicate dialog
// ---------------------------------------------------------------------------

export async function getDuplicateEntityCounts(productId: string): Promise<{
  supplyChain: number;
  batches: number;
  images: number;
  documents: number;
  suppliers: number;
}> {
  const [sc, batches, images, docs, suppliers] = await Promise.all([
    supabase.from('supply_chain_entries').select('id', { count: 'exact', head: true }).eq('product_id', productId),
    supabase.from('product_batches').select('id', { count: 'exact', head: true }).eq('product_id', productId),
    supabase.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', productId),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('product_id', productId),
    supabase.from('supplier_products').select('id', { count: 'exact', head: true }).eq('product_id', productId),
  ]);

  return {
    supplyChain: sc.count || 0,
    batches: batches.count || 0,
    images: images.count || 0,
    documents: docs.count || 0,
    suppliers: suppliers.count || 0,
  };
}

// ---------------------------------------------------------------------------
// Get full products for export
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBatchForExport(row: any): ProductBatch {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    batchNumber: row.batch_number || undefined,
    serialNumber: row.serial_number || '',
    productionDate: row.production_date || '',
    expirationDate: row.expiration_date || undefined,
    netWeight: row.net_weight != null ? Number(row.net_weight) : undefined,
    grossWeight: row.gross_weight != null ? Number(row.gross_weight) : undefined,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    pricePerUnit: row.price_per_unit != null ? Number(row.price_per_unit) : undefined,
    currency: row.currency || undefined,
    supplierId: row.supplier_id || undefined,
    status: row.status || 'draft',
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProductsForExport(
  productIds: string[],
  includeBatches?: boolean,
): Promise<Array<Product & { batches?: ProductBatch[] }>> {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('id', productIds);

  if (error || !data) return [];

  const products = data.map(transformProduct);

  if (includeBatches) {
    const { data: batchData } = await supabase
      .from('product_batches')
      .select('*')
      .in('product_id', productIds)
      .order('created_at', { ascending: true });

    const batchesByProduct: Record<string, ProductBatch[]> = {};
    if (batchData) {
      for (const row of batchData) {
        const pid = row.product_id;
        if (!batchesByProduct[pid]) batchesByProduct[pid] = [];
        batchesByProduct[pid].push(transformBatchForExport(row));
      }
    }

    return products.map(p => ({
      ...p,
      batches: batchesByProduct[p.id] || [],
    }));
  }

  return products;
}

// ---------------------------------------------------------------------------
// Bulk import products
// ---------------------------------------------------------------------------

export async function importProducts(
  products: Array<Partial<Product>>,
): Promise<{
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ index: number; name: string; error: string }>;
}> {
  const errors: Array<{ index: number; name: string; error: string }> = [];
  let imported = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const result = await createProduct({ ...p, gtin: p.gtin || '' });
    if (result.success) {
      imported++;
    } else {
      errors.push({ index: i, name: p.name || `Row ${i + 1}`, error: result.error || 'Unknown error' });
    }
  }

  return {
    success: errors.length === 0,
    imported,
    failed: errors.length,
    errors,
  };
}
