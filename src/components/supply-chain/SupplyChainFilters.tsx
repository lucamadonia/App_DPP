import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PROCESS_TYPE_CONFIG,
  STATUS_CONFIG,
  TRANSPORT_CONFIG,
} from '@/lib/supply-chain-constants';
import { type ProductListItem } from '@/services/supabase';

interface SupplyChainFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedProductId: string;
  setSelectedProductId: (value: string) => void;
  processTypeFilter: string;
  setProcessTypeFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  transportFilter: string;
  setTransportFilter: (value: string) => void;
  products: ProductListItem[];
  onRefresh: () => void;
  isLoading: boolean;
}

interface ActiveFilter {
  key: string;
  label: string;
  onClear: () => void;
}

export function SupplyChainFilters({
  searchQuery,
  setSearchQuery,
  selectedProductId,
  setSelectedProductId,
  processTypeFilter,
  setProcessTypeFilter,
  statusFilter,
  setStatusFilter,
  transportFilter,
  setTransportFilter,
  products,
  onRefresh,
  isLoading,
}: SupplyChainFiltersProps) {
  const { t } = useTranslation('settings');

  const activeFilters = useMemo(() => {
    const filters: ActiveFilter[] = [];

    if (selectedProductId !== 'all') {
      const productName = products.find(p => p.id === selectedProductId)?.name || selectedProductId;
      filters.push({
        key: 'product',
        label: `${t('Product')}: ${productName}`,
        onClear: () => setSelectedProductId('all'),
      });
    }

    if (processTypeFilter !== 'all') {
      const config = PROCESS_TYPE_CONFIG[processTypeFilter];
      filters.push({
        key: 'processType',
        label: `${t('Process Type')}: ${config ? t(config.label) : processTypeFilter}`,
        onClear: () => setProcessTypeFilter('all'),
      });
    }

    if (statusFilter !== 'all') {
      const config = STATUS_CONFIG[statusFilter];
      filters.push({
        key: 'status',
        label: `${t('Status')}: ${config ? t(config.label) : statusFilter}`,
        onClear: () => setStatusFilter('all'),
      });
    }

    if (transportFilter !== 'all') {
      const config = TRANSPORT_CONFIG[transportFilter];
      filters.push({
        key: 'transport',
        label: `${t('Transport')}: ${config ? t(config.label) : transportFilter}`,
        onClear: () => setTransportFilter('all'),
      });
    }

    if (searchQuery.trim()) {
      filters.push({
        key: 'search',
        label: `${t('Search...', { ns: 'common' })}: "${searchQuery}"`,
        onClear: () => setSearchQuery(''),
      });
    }

    return filters;
  }, [
    selectedProductId, processTypeFilter, statusFilter, transportFilter, searchQuery,
    products, t, setSelectedProductId, setProcessTypeFilter, setStatusFilter, setTransportFilter, setSearchQuery,
  ]);

  const activeFilterCount = activeFilters.length;

  return (
    <div className="space-y-3">
      {/* Main filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={t('Filter by product')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Products')}</SelectItem>
            {products.map(product => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={processTypeFilter} onValueChange={setProcessTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('Process Type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Types')}</SelectItem>
            {Object.entries(PROCESS_TYPE_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {t(config.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Status')}</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {t(config.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={transportFilter} onValueChange={setTransportFilter}>
          <SelectTrigger className="w-[140px] hidden md:flex">
            <SelectValue placeholder={t('Transport')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Types')}</SelectItem>
            {Object.entries(TRANSPORT_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {t(config.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search...', { ns: 'common' })}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {activeFilterCount}
          </Badge>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1">
          {activeFilters.map(filter => (
            <Badge
              key={filter.key}
              variant="outline"
              className="gap-1.5 pl-2.5 pr-1 py-1 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={filter.onClear}
            >
              <span className="text-xs">{filter.label}</span>
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </Badge>
          ))}
          {activeFilters.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => {
                setSearchQuery('');
                setSelectedProductId('all');
                setProcessTypeFilter('all');
                setStatusFilter('all');
                setTransportFilter('all');
              }}
            >
              {t('Clear all')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
