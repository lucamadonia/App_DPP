import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/v1/public/products?tenant=<slug>
 *
 * Returns products configured for the public transparency page.
 * Respects transparency_page_config for filtering and ordering.
 * Falls back to all published products if no config exists.
 *
 * Response:
 * {
 *   "page": { "title": null, "description": null, "heroImage": null },
 *   "products": [
 *     {
 *       "slug": "magnetuhr",
 *       "name": "Magnetuhr",
 *       "image": "https://...",
 *       "dppUrl": "https://dpp-app.fambliss.eu/p/<gtin>/<serial>",
 *       "dimensions": "Ø 30 cm",
 *       "categories": ["materials", "certificates"]
 *     }
 *   ]
 * }
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
    // 1. Resolve tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single();

    if (tenantError || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // 2. Load transparency page config (if exists)
    const { data: tConfig } = await supabase
      .from('transparency_page_config')
      .select('page_title, page_description, hero_image_url, products')
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

    // 3. Get products for this tenant
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        gtin,
        serial_number,
        category,
        image_url,
        status,
        materials,
        certifications,
        carbon_footprint,
        recyclability,
        product_height_cm,
        product_width_cm,
        product_depth_cm,
        packaging_type
      `)
      .eq('tenant_id', tenant.id)
      .order('name', { ascending: true });

    if (productsError) {
      console.error('Failed to load products:', productsError);
      return res.status(500).json({ error: 'Failed to load products' });
    }

    // 4. Filter products: if config exists, only enabled + published; otherwise all published
    let filtered = (products || []).filter((p: any) => {
      if (hasConfig) {
        return enabledIds.has(p.id) && p.status === 'published';
      }
      return p.status === 'published';
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

    // 7. Transform to public API format
    const result = filtered.map((p: any) => {
      const dppUrl = p.gtin && p.serial_number
        ? `https://dpp-app.fambliss.eu/p/${p.gtin}/${p.serial_number}`
        : null;

      const dims: string[] = [];
      if (p.product_height_cm && p.product_width_cm) {
        dims.push(`${p.product_width_cm} × ${p.product_height_cm}`);
        if (p.product_depth_cm) dims[0] += ` × ${p.product_depth_cm}`;
        dims[0] += ' cm';
      }

      const categories: string[] = [];
      if (p.materials && Array.isArray(p.materials) && p.materials.length > 0) {
        categories.push('materials');
      }
      if (p.certifications && Array.isArray(p.certifications) && p.certifications.length > 0) {
        categories.push('certificates');
      }
      if (p.packaging_type) {
        categories.push('packaging');
      }
      if (p.carbon_footprint) {
        categories.push('sustainability');
      }
      if (p.recyclability?.recyclablePercentage > 0 || p.recyclability?.instructions) {
        categories.push('recycling');
      }

      const slug = p.name
        .toLowerCase()
        .replace(/[äÄ]/g, 'ae')
        .replace(/[öÖ]/g, 'oe')
        .replace(/[üÜ]/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      return {
        slug,
        name: p.name,
        image: imageMap[p.id] || p.image_url || null,
        dppUrl,
        dimensions: dims[0] || null,
        categories,
        category: p.category || null,
      };
    });

    return res.status(200).json({
      page: {
        title: tConfig?.page_title || null,
        description: tConfig?.page_description || null,
        heroImage: tConfig?.hero_image_url || null,
      },
      products: result,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
