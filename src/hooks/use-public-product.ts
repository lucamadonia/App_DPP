import { useState, useEffect } from 'react';
import { type Product } from '@/types/product';
import { type VisibilityConfigV2, defaultVisibilityConfigV2 } from '@/types/visibility';
import { getProductByGtinSerial, getPublicVisibilitySettings } from '@/services/supabase';
import { getPublicTenantQRSettings, getPublicTenantDPPDesign } from '@/services/supabase/tenants';
import type { DPPDesignSettings, DPPTemplateName } from '@/types/database';

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
