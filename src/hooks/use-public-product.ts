import { useState, useEffect } from 'react';
import { type Product } from '@/types/product';
import { type VisibilityConfigV2, defaultVisibilityConfigV2 } from '@/types/visibility';
import { getProductByGtinSerial, getPublicVisibilitySettings } from '@/services/supabase';

export function usePublicProduct(gtin?: string, serial?: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [visibilityV2, setVisibilityV2] = useState<VisibilityConfigV2 | null>(null);
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

        const visibility = await getPublicVisibilitySettings(gtin, serial);
        setVisibilityV2(visibility);
      } catch (error) {
        console.error('Error loading product data:', error);
        setProduct(null);
        setVisibilityV2(defaultVisibilityConfigV2);
      }

      setLoading(false);
    }

    loadData();
  }, [gtin, serial]);

  return { product, visibilityV2, loading };
}
