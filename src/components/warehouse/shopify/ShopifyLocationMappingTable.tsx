import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RefreshCw, Star, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/ui/responsive-table';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import {
  fetchShopifyLocations,
  createShopifyLocationMap,
  updateShopifyLocationMap,
  deleteShopifyLocationMap,
} from '@/services/supabase/shopify-integration';
import type { ShopifyLocationMap, ShopifyLocation } from '@/types/shopify';
import type { WhLocation } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';

interface Props {
  maps: ShopifyLocationMap[];
  onRefresh: () => void;
}

export function ShopifyLocationMappingTable({ maps, onRefresh }: Props) {
  const { t } = useTranslation('warehouse');
  const { toast } = useToast();

  const [shopifyLocations, setShopifyLocations] = useState<ShopifyLocation[]>([]);
  const [whLocations, setWhLocations] = useState<WhLocation[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selectedShopifyLoc, setSelectedShopifyLoc] = useState('');
  const [selectedWhLoc, setSelectedWhLoc] = useState('');
  const [adding, setAdding] = useState(false);

  const mappedShopifyLocIds = new Set(maps.map(m => m.shopifyLocationId));

  useEffect(() => { loadWhLocations(); }, []);

  async function loadWhLocations() {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    const { data } = await supabase
      .from('wh_locations')
      .select('id, tenant_id, name, code, type, is_active, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setWhLocations((data || []).map((d: any) => ({
      id: d.id,
      tenantId: d.tenant_id,
      name: d.name,
      code: d.code || undefined,
      type: d.type || 'main',
      isActive: d.is_active,
      zones: [],
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })));
  }

  async function handleFetchLocations() {
    setFetching(true);
    try {
      const locations = await fetchShopifyLocations();
      setShopifyLocations(locations);
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  }

  async function handleAdd() {
    if (!selectedShopifyLoc || !selectedWhLoc) return;
    const shopifyLoc = shopifyLocations.find(l => String(l.id) === selectedShopifyLoc);
    if (!shopifyLoc) return;

    setAdding(true);
    try {
      await createShopifyLocationMap({
        shopifyLocationId: shopifyLoc.id,
        shopifyLocationName: shopifyLoc.name,
        locationId: selectedWhLoc,
        isPrimary: maps.length === 0, // First one is primary
      });
      setSelectedShopifyLoc('');
      setSelectedWhLoc('');
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: string, field: 'syncInventory' | 'syncOrders', value: boolean) {
    try {
      await updateShopifyLocationMap(id, { [field]: value });
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      await updateShopifyLocationMap(id, { isPrimary: true });
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteShopifyLocationMap(id);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  }

  const unmappedShopifyLocations = shopifyLocations.filter(l => !mappedShopifyLocIds.has(l.id));

  const columns: ResponsiveTableColumn<ShopifyLocationMap>[] = [
    {
      id: 'shopifyLocation',
      header: t('Shopify Location'),
      className: 'font-medium text-xs sm:text-sm',
      mobilePriority: 'title',
      cell: map => map.shopifyLocationName || `#${map.shopifyLocationId}`,
    },
    {
      id: 'whLocation',
      header: t('Warehouse Location'),
      className: 'text-xs sm:text-sm',
      mobilePriority: 'subtitle',
      cell: map => (
        <>
          {map.locationName || map.locationId}
          {map.locationCode && <span className="text-xs text-muted-foreground ml-1">({map.locationCode})</span>}
        </>
      ),
    },
    {
      id: 'syncInventory',
      header: t('Sync Inventory'),
      className: 'text-center',
      hideBelow: 'sm',
      mobilePriority: 'meta',
      mobileLabel: t('Sync Inventory'),
      cell: map => <Switch checked={map.syncInventory} onCheckedChange={v => handleToggle(map.id, 'syncInventory', v)} />,
    },
    {
      id: 'syncOrders',
      header: t('Sync Orders'),
      className: 'text-center',
      hideBelow: 'sm',
      mobilePriority: 'meta',
      mobileLabel: t('Sync Orders'),
      cell: map => <Switch checked={map.syncOrders} onCheckedChange={v => handleToggle(map.id, 'syncOrders', v)} />,
    },
    {
      id: 'primary',
      header: t('Primary'),
      className: 'text-center',
      hideBelow: 'md',
      mobilePriority: 'badge',
      cell: map => (map.isPrimary ? (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
          <Star className="mr-1 h-3 w-3 fill-current" />{t('Primary')}
        </Badge>
      ) : (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSetPrimary(map.id)}>
          {t('Primary')}
        </Button>
      )),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      mobilePriority: 'meta',
      cell: map => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(map.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleFetchLocations} disabled={fetching}>
          {fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          <span className="hidden sm:inline">{t('Fetch Locations')}</span>
          <span className="sm:hidden">{t('Fetch')}</span>
        </Button>
      </div>

      {/* Add new mapping */}
      {unmappedShopifyLocations.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border p-3 bg-muted/30">
          <Select value={selectedShopifyLoc} onValueChange={setSelectedShopifyLoc}>
            <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
              <SelectValue placeholder={t('Shopify Location')} />
            </SelectTrigger>
            <SelectContent>
              {unmappedShopifyLocations.map(l => (
                <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground hidden sm:inline text-center">→</span>
          <Select value={selectedWhLoc} onValueChange={setSelectedWhLoc}>
            <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
              <SelectValue placeholder={t('Select warehouse...')} />
            </SelectTrigger>
            <SelectContent>
              {whLocations.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name} {l.code ? `(${l.code})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 w-full sm:w-auto" onClick={handleAdd} disabled={adding || !selectedShopifyLoc || !selectedWhLoc}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <ResponsiveTable
        data={maps}
        columns={columns}
        rowKey={map => map.id}
        emptyState={
          <div className="rounded-lg border border-dashed p-6 sm:p-8 text-center text-xs sm:text-sm text-muted-foreground">
            {t('No location mappings')}
          </div>
        }
      />

      <p className="text-xs text-muted-foreground">{t('Primary Location Help')}</p>
    </div>
  );
}
