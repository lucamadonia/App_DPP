import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');

/**
 * GET /api/v1/public/products?tenant=<slug>
 * Returns transparency page data with products, batches, and branding.
 *
 * Returns products configured for the public transparency page,
 * including full DPP consumer data and per-batch details with overrides.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tenantSlug = req.query.tenant as string;
  if (!tenantSlug) {
    return res.status(400).json({ error: 'Missing required query parameter: tenant' });
  }

  try {
    // 1. Resolve tenant by slug (include branding info)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, settings')
      .eq('slug', tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // 2. Load transparency page config (if exists)
    const { data: tConfig } = await supabase
      .from('transparency_page_config')
      .select('page_title, page_description, hero_image_url, products, design, access_control')
      .eq('tenant_id', tenant.id)
      .single();

    // Build enabled product IDs set and order map from config
    const configProducts: Array<{ product_id: string; enabled: boolean }> =
      tConfig?.products ?? [];
    const enabledIds = new Set(
      configProducts.filter((e) => e.enabled).map((e) => e.product_id)
    );
    const orderMap = new Map(
      configProducts
        .filter((e) => e.enabled)
        .map((e, idx) => [e.product_id, idx])
    );
    const hasConfig = configProducts.length > 0;

    // 3. Get products for this tenant (full DPP consumer data)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        manufacturer,
        gtin,
        serial_number,
        category,
        image_url,
        status,
        country_of_origin,
        materials,
        certifications,
        carbon_footprint,
        recyclability,
        product_height_cm,
        product_width_cm,
        product_depth_cm,
        packaging_type,
        packaging_description,
        recycled_content_percentage,
        durability_years,
        repairability_score,
        energy_consumption_kwh,
        ce_marking,
        support_resources,
        user_manual_url,
        safety_information
      `)
      .eq('tenant_id', tenant.id)
      .order('name', { ascending: true });

    if (productsError) {
      console.error('Failed to load products:', productsError);
      return res.status(500).json({ error: 'Failed to load products' });
    }

    // 4. Filter products: if config exists, show enabled products (any status);
    //    without config, only show live products
    let filtered = (products || []).filter((p: any) => {
      if (hasConfig) {
        return enabledIds.has(p.id) && p.status !== 'archived';
      }
      return p.status === 'live';
    });

    // 5. Sort by config order if available
    if (hasConfig) {
      filtered.sort((a: any, b: any) => {
        const orderA = orderMap.get(a.id) ?? 999;
        const orderB = orderMap.get(b.id) ?? 999;
        return orderA - orderB;
      });
    }

    // 6. Get primary images for these products
    const productIds = filtered.map((p: any) => p.id);
    let imageMap: Record<string, string> = {};

    if (productIds.length > 0) {
      const { data: images } = await supabase
        .from('product_images')
        .select('product_id, url')
        .in('product_id', productIds)
        .eq('is_primary', true);

      if (images) {
        imageMap = Object.fromEntries(
          images.map((img: any) => [img.product_id, img.url])
        );
      }
    }

    // 7. Get batches for these products (only live batches)
    let batchMap: Record<string, any[]> = {};
    if (productIds.length > 0) {
      const { data: batches } = await supabase
        .from('product_batches')
        .select(`
          id,
          product_id,
          batch_number,
          serial_number,
          production_date,
          expiration_date,
          quantity,
          net_weight,
          gross_weight,
          status,
          materials_override,
          certifications_override,
          carbon_footprint_override,
          recyclability_override,
          description_override,
          product_height_cm,
          product_width_cm,
          product_depth_cm
        `)
        .in('product_id', productIds)
        .eq('status', 'live')
        .order('production_date', { ascending: false });

      if (batches) {
        for (const b of batches) {
          if (!batchMap[b.product_id]) batchMap[b.product_id] = [];
          batchMap[b.product_id].push(b);
        }
      }
    }

    // 8. Get consumer-visible documents for these products
    let docMap: Record<string, any[]> = {};
    if (productIds.length > 0) {
      const { data: docs } = await supabase
        .from('documents')
        .select('id, product_id, name, category, url, type, size, valid_until, visibility')
        .in('product_id', productIds)
        .in('visibility', ['consumer', 'customs'])
        .order('name', { ascending: true });

      if (docs) {
        for (const d of docs) {
          if (!docMap[d.product_id]) docMap[d.product_id] = [];
          docMap[d.product_id].push(d);
        }
      }
    }

    // 9. Transform to public API format with full DPP data
    const result = filtered.map((p: any) => {
      const dppUrl = p.gtin && p.serial_number
        ? `https://dpp-app.fambliss.eu/p/${p.gtin}/${p.serial_number}`
        : null;

      const dims = formatDimensions(p.product_width_cm, p.product_height_cm, p.product_depth_cm);

      const slug = toSlug(p.name);

      // Transform batches with override indicators
      const productBatches = (batchMap[p.id] || []).map((b: any) => {
        const batchDppUrl = p.gtin && b.serial_number
          ? `https://dpp-app.fambliss.eu/p/${p.gtin}/${b.serial_number}`
          : null;

        const overrides: Record<string, any> = {};
        if (b.materials_override) overrides.materials = b.materials_override;
        if (b.certifications_override) overrides.certifications = b.certifications_override;
        if (b.carbon_footprint_override) overrides.carbonFootprint = b.carbon_footprint_override;
        if (b.recyclability_override) overrides.recyclability = b.recyclability_override;
        if (b.description_override) overrides.description = b.description_override;

        const batchDims = formatDimensions(b.product_width_cm, b.product_height_cm, b.product_depth_cm);

        return {
          batchNumber: b.batch_number || null,
          serialNumber: b.serial_number,
          productionDate: b.production_date || null,
          expirationDate: b.expiration_date || null,
          quantity: b.quantity || null,
          netWeight: b.net_weight || null,
          grossWeight: b.gross_weight || null,
          dimensions: batchDims,
          dppUrl: batchDppUrl,
          hasOverrides: Object.keys(overrides).length > 0,
          overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        };
      });

      return {
        id: p.id,
        slug,
        name: p.name,
        description: p.description || null,
        manufacturer: p.manufacturer || null,
        gtin: p.gtin || null,
        image: imageMap[p.id] || p.image_url || null,
        dppUrl,
        category: p.category || null,
        countryOfOrigin: p.country_of_origin || null,
        dimensions: dims,
        materials: p.materials || [],
        certifications: (p.certifications || []).map((c: any) => ({
          name: c.name,
          issuedBy: c.issuedBy,
          validUntil: c.validUntil,
          certificateUrl: c.certificateUrl || c.url || null,
        })),
        carbonFootprint: p.carbon_footprint || null,
        recyclability: p.recyclability || null,
        sustainability: {
          recycledContentPercentage: p.recycled_content_percentage ?? null,
          durabilityYears: p.durability_years ?? null,
          repairabilityScore: p.repairability_score ?? null,
          energyConsumptionKwh: p.energy_consumption_kwh ?? null,
        },
        ceMarking: p.ce_marking ?? false,
        packagingType: p.packaging_type || null,
        documents: (docMap[p.id] || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          url: d.url,
          type: d.type,
          size: d.size,
          validUntil: d.valid_until || null,
        })),
        supportResources: p.support_resources || null,
        userManualUrl: p.user_manual_url || null,
        safetyInformation: p.safety_information || null,
        batches: productBatches,
      };
    });

    // Extract branding from tenant settings
    const settings = tenant.settings as any;
    const branding = {
      name: tenant.name,
      logo: settings?.branding?.logo || null,
      primaryColor: settings?.branding?.primaryColor || '#3B82F6',
    };

    return res.status(200).json({
      page: {
        title: tConfig?.page_title || null,
        description: tConfig?.page_description || null,
        heroImage: tConfig?.hero_image_url || null,
      },
      branding,
      design: tConfig?.design || {},
      accessControl: tConfig?.access_control || { enabled: false },
      products: result,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function formatDimensions(w?: number, h?: number, d?: number): string | null {
  if (!w && !h) return null;
  let s = `${w ?? '?'} × ${h ?? '?'}`;
  if (d) s += ` × ${d}`;
  return s + ' cm';
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
