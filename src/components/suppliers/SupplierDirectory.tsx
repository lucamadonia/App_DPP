import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, RefreshCw, Building2, Plus, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { gridStagger, useReducedMotion } from '@/lib/motion';
import { SupplierCard } from './SupplierCard';
import { SUPPLIER_TYPES } from './supplier-helpers';
import type { Supplier, Country } from '@/types/database';

const STATUS_CHIPS: { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'All' },
  { value: 'active', labelKey: 'Active' },
  { value: 'pending_approval', labelKey: 'Approval' },
  { value: 'inactive', labelKey: 'Inactive' },
  { value: 'blocked', labelKey: 'Blocked' },
];

interface SupplierDirectoryProps {
  suppliers: Supplier[];
  countries: Country[];
  productCounts: Record<string, number>;
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onInvite: () => void;
  onOpenDetail: (supplier: Supplier) => void;
  onOpenFullPage: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onAssignProducts: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
  onApprove: (supplier: Supplier) => void;
  onReject: (supplier: Supplier) => void;
}

/** Supplier directory: search, filter chips and scorecard grid */
export function SupplierDirectory({
  suppliers, countries, productCounts, isLoading,
  onRefresh, onCreate, onInvite,
  onOpenDetail, onOpenFullPage, onEdit, onAssignProducts, onDelete, onApprove, onReject,
}: SupplierDirectoryProps) {
  const { t } = useTranslation('settings');
  const prefersReduced = useReducedMotion();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');

  const getCountryName = (code: string) => countries.find(c => c.code === code)?.name || code;

  // Countries actually present in the supplier list (for the filter)
  const supplierCountries = useMemo(() => {
    const codes = Array.from(new Set(suppliers.map(s => s.country))).filter(Boolean);
    return codes
      .map(code => ({ code, name: getCountryName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers, countries]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return suppliers.filter(supplier => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(q) ||
        (supplier.code?.toLowerCase().includes(q) ?? false) ||
        (supplier.city?.toLowerCase().includes(q) ?? false) ||
        (supplier.contact_person?.toLowerCase().includes(q) ?? false) ||
        supplier.country.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || supplier.risk_level === riskFilter;
      const matchesType = typeFilter === 'all' || supplier.supplier_type === typeFilter;
      const matchesCountry = countryFilter === 'all' || supplier.country === countryFilter;
      return matchesSearch && matchesStatus && matchesRisk && matchesType && matchesCountry;
    });
  }, [suppliers, searchQuery, statusFilter, riskFilter, typeFilter, countryFilter]);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || riskFilter !== 'all'
    || typeFilter !== 'all' || countryFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRiskFilter('all');
    setTypeFilter('all');
    setCountryFilter('all');
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">{t('Supplier List')}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('Search suppliers...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="min-h-[44px] pl-9 sm:min-h-9"
              />
            </div>
            <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px] shrink-0 sm:min-h-9 sm:min-w-9" onClick={onRefresh} title={t('Refresh')}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filter chips + selects */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Status')}>
            {STATUS_CHIPS.map(chip => (
              <motion.button
                key={chip.value}
                type="button"
                whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                onClick={() => setStatusFilter(chip.value)}
                className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === chip.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {t(chip.labelKey)}
              </motion.button>
            ))}
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-full text-xs">
              <SelectValue placeholder={t('Type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Types')}</SelectItem>
              {SUPPLIER_TYPES.map(st => (
                <SelectItem key={st.value} value={st.value}>{t(st.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[120px] rounded-full text-xs">
              <SelectValue placeholder={t('Country')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Countries')}</SelectItem>
              {supplierCountries.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[100px] rounded-full text-xs">
              <SelectValue placeholder={t('Risk')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Risk Levels')}</SelectItem>
              <SelectItem value="low">{t('Low')}</SelectItem>
              <SelectItem value="medium">{t('Medium')}</SelectItem>
              <SelectItem value="high">{t('High')}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 rounded-full text-xs" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              {t('Clear filters')}
            </Button>
          )}

          {!isLoading && (
            <Badge variant="secondary" className="ml-auto tabular-nums">
              {t('{{count}} suppliers', { count: filteredSuppliers.length })}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && suppliers.length === 0 ? (
          // Skeleton grid while loading
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          // Empty state with CTA
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">
                {suppliers.length === 0 ? t('No suppliers yet') : t('No results')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {suppliers.length === 0
                  ? t('Create your first supplier or invite one via the supplier portal.')
                  : t('Try adjusting your search or filters.')}
              </p>
            </div>
            {suppliers.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={onCreate} className="min-h-[44px]">
                  <Plus className="mr-2 h-4 w-4" />{t('New Supplier')}
                </Button>
                <Button variant="outline" onClick={onInvite} className="min-h-[44px]">
                  <Mail className="mr-2 h-4 w-4" />{t('Invite Supplier')}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={clearFilters} className="min-h-[44px]">
                <X className="mr-2 h-4 w-4" />{t('Clear filters')}
              </Button>
            )}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            variants={prefersReduced ? undefined : gridStagger}
            initial={prefersReduced ? undefined : 'initial'}
            animate={prefersReduced ? undefined : 'animate'}
          >
            {filteredSuppliers.map(supplier => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                countryName={getCountryName(supplier.country)}
                productCount={productCounts[supplier.id]}
                onOpenDetail={onOpenDetail}
                onOpenFullPage={onOpenFullPage}
                onEdit={onEdit}
                onAssignProducts={onAssignProducts}
                onDelete={onDelete}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
