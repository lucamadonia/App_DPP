import { useState, useEffect } from 'react';
import { type Product } from '@/types/product';
import { type VisibilityConfigV2, type VisibilityConfigV3, defaultVisibilityConfigV3 } from '@/types/visibility';
import { getPublicDppProduct, type PublicDppView } from '@/services/supabase/products';
import { getPublicTenantById } from '@/services/supabase/public-tenant';
import type { DPPDesignSettings, DPPTemplateName, SupportResources } from '@/types/database';

/**
 * Return a product with translated text fields applied for the given locale.
 * Falls back to the product's default fields if no translation exists.
 */
export function getTranslatedProduct(product: Product, locale: string): Product {
  const translation = product.translations?.[locale];
  if (!translation) return product;

  const merged = { ...product };
  if (translation.name) merged.name = translation.name;
  if (translation.description) merged.description = translation.description;
  if (translation.recyclingInstructions && merged.recyclability) {
    merged.recyclability = {
      ...merged.recyclability,
      instructions: translation.recyclingInstructions,
    };
  }
  if (translation.packagingInstructions && merged.recyclability) {
    merged.recyclability = {
      ...merged.recyclability,
      packagingInstructions: translation.packagingInstructions,
    };
  }
  if (translation.supportResources && merged.supportResources) {
    const sr = translation.supportResources;
    merged.supportResources = {
      ...merged.supportResources,
      ...(sr.instructions !== undefined && { instructions: sr.instructions }),
      ...(sr.assemblyGuide !== undefined && { assemblyGuide: sr.assemblyGuide }),
      ...(sr.faq !== undefined && { faq: sr.faq }),
      ...(sr.warranty !== undefined && {
        warranty: { ...merged.supportResources.warranty, ...sr.warranty },
      }),
      ...(sr.repairInfo !== undefined && {
        repairInfo: { ...merged.supportResources.repairInfo, ...sr.repairInfo },
      }),
    } as SupportResources;
  }
  return merged;
}

export type DPPTemplate = DPPTemplateName;

/**
 * Load a public DPP (consumer or customs view). All product data comes from the
 * server-filtered RPC get_public_dpp_product (Visibility V3 applied per view);
 * tenant QR/design settings come from the allow-listed get_public_tenant_by_id.
 */
export function usePublicProduct(gtin?: string, serial?: string, view: PublicDppView = 'consumer') {
  const [product, setProduct] = useState<Product | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [visibilityV2, setVisibilityV2] = useState<VisibilityConfigV2 | VisibilityConfigV3 | null>(null);
  const [dppTemplate, setDppTemplate] = useState<DPPTemplate>('modern');
  const [dppTemplateCustomer, setDppTemplateCustomer] = useState<DPPTemplate>('modern');
  const [dppTemplateCustoms, setDppTemplateCustoms] = useState<DPPTemplate>('modern');
  const [dppDesign, setDppDesign] = useState<DPPDesignSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!gtin || !serial) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const result = await getPublicDppProduct(gtin, serial, view);
        if (cancelled) return;

        setProduct(result?.product ?? null);
        setTenantId(result?.tenantId ?? null);
        setVisibilityV2(result?.visibility ?? defaultVisibilityConfigV3);

        const tenant = result?.tenantId ? await getPublicTenantById(result.tenantId) : null;
        if (cancelled) return;
        const qrSettings = tenant?.settings?.qrCode;
        if (qrSettings) {
          // Legacy fallback: use dppTemplate if specific ones aren't set
          const fallback = (qrSettings.dppTemplate as DPPTemplate) || 'modern';
          setDppTemplate(fallback);
          setDppTemplateCustomer((qrSettings.dppTemplateCustomer as DPPTemplate) || fallback);
          setDppTemplateCustoms((qrSettings.dppTemplateCustoms as DPPTemplate) || fallback);
        }
        setDppDesign(tenant?.settings?.dppDesign || null);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading product data:', error);
        setProduct(null);
        setVisibilityV2(defaultVisibilityConfigV3);
      }

      setLoading(false);
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [gtin, serial, view]);

  return { product, tenantId, visibilityV2, dppTemplate, dppTemplateCustomer, dppTemplateCustoms, dppDesign, loading };
}
