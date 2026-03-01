import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBillingOptional } from '@/contexts/BillingContext';
import {
  getShopifySettings,
  getShopifyProductMaps,
  getShopifyLocationMaps,
  getShopifySyncLogs,
} from '@/services/supabase/shopify-integration';
import type {
  ShopifyIntegrationSettings,
  ShopifyProductMap,
  ShopifyLocationMap,
  ShopifySyncLog,
} from '@/types/shopify';
import { DEFAULT_SHOPIFY_SYNC_CONFIG } from '@/types/shopify';
import { ShopifyConnectionCard } from '@/components/warehouse/shopify/ShopifyConnectionCard';
import { ShopifyProductMappingTable } from '@/components/warehouse/shopify/ShopifyProductMappingTable';
import { ShopifyLocationMappingTable } from '@/components/warehouse/shopify/ShopifyLocationMappingTable';
import { ShopifySyncConfigCard } from '@/components/warehouse/shopify/ShopifySyncConfigCard';
import { ShopifySyncDashboard } from '@/components/warehouse/shopify/ShopifySyncDashboard';

export function ShopifyIntegrationPage() {
  const { t } = useTranslation('warehouse');
  const billing = useBillingOptional();

  const [settings, setSettings] = useState<ShopifyIntegrationSettings | null>(null);
  const [productMaps, setProductMaps] = useState<ShopifyProductMap[]>([]);
  const [locationMaps, setLocationMaps] = useState<ShopifyLocationMap[]>([]);
  const [syncLogs, setSyncLogs] = useState<ShopifySyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const isConnected = settings?.enabled && settings?.shopDomain;

  // Check billing gate
  const hasModule = billing
    ? (billing.hasModule('warehouse_professional') || billing.hasModule('warehouse_business'))
    : true; // Allow if billing not loaded yet

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, pm, lm, sl] = await Promise.all([
        getShopifySettings(),
        getShopifyProductMaps(),
        getShopifyLocationMaps(),
        getShopifySyncLogs(),
      ]);
      setSettings(s);
      setProductMaps(pm);
      setLocationMaps(lm);
      setSyncLogs(sl);
    } catch (err) {
      console.error('Failed to load Shopify data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!hasModule) {
    return (
      <div className="px-4 py-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
          <h1 className="text-xl sm:text-2xl font-bold">{t('Shopify Integration')}</h1>
        </div>
        <div className="rounded-lg border border-dashed p-8 sm:p-12 text-center">
          <Lock className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">{t('Shopify module required')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
          <h1 className="text-xl sm:text-2xl font-bold">{t('Shopify Integration')}</h1>
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-lg border bg-muted/30 animate-pulse" />
          <div className="h-64 rounded-lg border bg-muted/30 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t('Shopify Integration')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('Connect your Shopify store')}</p>
        </div>
      </div>

      <Tabs defaultValue="connection">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="mb-4 sm:mb-6">
            <TabsTrigger value="connection" className="text-xs sm:text-sm">{t('Connection')}</TabsTrigger>
            <TabsTrigger value="products" disabled={!isConnected} className="text-xs sm:text-sm">{t('Product Mapping')}</TabsTrigger>
            <TabsTrigger value="locations" disabled={!isConnected} className="text-xs sm:text-sm">{t('Location Mapping')}</TabsTrigger>
            <TabsTrigger value="config" disabled={!isConnected} className="text-xs sm:text-sm">{t('Sync Configuration')}</TabsTrigger>
            <TabsTrigger value="sync" disabled={!isConnected} className="text-xs sm:text-sm">{t('Sync Dashboard')}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="connection">
          <ShopifyConnectionCard settings={settings} onRefresh={loadAll} />
        </TabsContent>

        <TabsContent value="products">
          <ShopifyProductMappingTable maps={productMaps} onRefresh={loadAll} />
        </TabsContent>

        <TabsContent value="locations">
          <ShopifyLocationMappingTable maps={locationMaps} onRefresh={loadAll} />
        </TabsContent>

        <TabsContent value="config">
          <ShopifySyncConfigCard
            config={settings?.syncConfig || DEFAULT_SHOPIFY_SYNC_CONFIG}
            onRefresh={loadAll}
          />
        </TabsContent>

        <TabsContent value="sync">
          <ShopifySyncDashboard logs={syncLogs} onRefresh={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
