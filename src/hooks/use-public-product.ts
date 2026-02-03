import { useState, useEffect } from 'react';
import { type Product } from '@/types/product';
import { type VisibilityConfigV2, defaultVisibilityConfigV2 } from '@/types/visibility';
import { getProductByGtinSerial, getPublicVisibilitySettings, getProductComponentsPublic } from '@/services/supabase';
import { getPublicTenantQRSettings, getPublicTenantDPPDesign } from '@/services/supabase/tenants';
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

export function usePublicProduct(gtin?: string, serial?: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [visibilityV2, setVisibilityV2] = useState<VisibilityConfigV2 | null>(null);
  const [dppTemplate, setDppTemplate] = useState<DPPTemplate>('modern');
  const [dppTemplateCustomer, setDppTemplateCustomer] = useState<DPPTemplate>('modern');
  const [dppTemplateCustoms, setDppTemplateCustoms] = useState<DPPTemplate>('modern');
  const [dppDesign, setDppDesign] = useState<DPPDesignSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!gtin || !serial) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const apiProduct = await getProductByGtinSerial(gtin, serial);

        // If this is a set, load components
        if (apiProduct?.productType === 'set' && apiProduct.id) {
          const components = await getProductComponentsPublic(apiProduct.id);
          apiProduct.components = components;
        }

        setProduct(apiProduct);

        const [visibility, qrSettings, designSettings] = await Promise.all([
          getPublicVisibilitySettings(gtin, serial),
          getPublicTenantQRSettings(gtin, serial),
          getPublicTenantDPPDesign(gtin, serial),
        ]);
        setVisibilityV2(visibility);
        if (qrSettings) {
          // Legacy fallback: use dppTemplate if specific ones aren't set
          const fallback = (qrSettings.dppTemplate as DPPTemplate) || 'modern';
          setDppTemplate(fallback);
          setDppTemplateCustomer((qrSettings.dppTemplateCustomer as DPPTemplate) || fallback);
          setDppTemplateCustoms((qrSettings.dppTemplateCustoms as DPPTemplate) || fallback);
        }
        setDppDesign(designSettings);
      } catch (error) {
        console.error('Error loading product data:', error);
        setProduct(null);
        setVisibilityV2(defaultVisibilityConfigV2);
      }

      setLoading(false);
    }

    loadData();
  }, [gtin, serial]);

  return { product, visibilityV2, dppTemplate, dppTemplateCustomer, dppTemplateCustoms, dppDesign, loading };
}
