import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Layers, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useLocale } from '@/hooks/use-locale';
import { formatDate, formatCurrency } from '@/lib/format';
import type { SupplierSpendDetail } from '@/services/supabase';
import {
  maskIban, getContractStatus, getContractProgress, daysUntil,
} from './supplier-helpers';
import type { Supplier, SupplierProduct } from '@/types/database';

type SupplierProductWithName = SupplierProduct & { product_name?: string };

interface SupplierDetailFinanceTabProps {
  supplier: Supplier;
  spend: SupplierSpendDetail | null;
  products: SupplierProductWithName[];
  getProductName: (sp: SupplierProductWithName) => string;
}

/** Finance tab of the supplier detail sheet: spend, contract, payment, bank, volume pricing */
export function SupplierDetailFinanceTab({ supplier, spend, products, getProductName }: SupplierDetailFinanceTabProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const [showIban, setShowIban] = useState(false);

  return (
    <div className="space-y-4">
      {spend && spend.totalSpend > 0 && (
        <>
          <div className="space-y-2">
            <h4 className="flex items-center gap-1 text-sm font-medium">
              <DollarSign className="h-4 w-4" /> {t('Supplier Spend')}
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border bg-card p-2">
                <p className="text-xs text-muted-foreground">{t('Total Spend')}</p>
                <p className="text-sm font-bold tabular-nums">{formatCurrency(spend.totalSpend, spend.currency, locale)}</p>
              </div>
              <div className="rounded-lg border bg-card p-2">
                <p className="text-xs text-muted-foreground">{t('Batches')}</p>
                <p className="text-sm font-bold tabular-nums">{spend.totalBatches}</p>
              </div>
              <div className="rounded-lg border bg-card p-2">
                <p className="text-xs text-muted-foreground">{t('Quantity')}</p>
                <p className="text-sm font-bold tabular-nums">{spend.totalQuantity.toLocaleString()}</p>
              </div>
            </div>
            {spend.byProduct.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-xs font-medium text-muted-foreground">{t('Spend by Product')}</h5>
                <div className="space-y-1">
                  {spend.byProduct.map(bp => (
                    <div key={bp.productId} className="flex items-center justify-between rounded border p-1.5 text-xs">
                      <span className="mr-2 flex-1 truncate">{bp.productName}</span>
                      <span className="whitespace-nowrap font-medium tabular-nums">{formatCurrency(bp.spend, spend.currency, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {(supplier.contract_start || supplier.contract_end) && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t('Contract Period')}</h4>
              {(() => {
                const status = getContractStatus(supplier);
                if (!status) return null;
                return <Badge className={`${status.bg} ${status.color}`}>{t(status.labelKey)}</Badge>;
              })()}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>{t('Start')}:</span>
                <span>{supplier.contract_start ? formatDate(supplier.contract_start, locale) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('End')}:</span>
                <span>{supplier.contract_end ? formatDate(supplier.contract_end, locale) : '-'}</span>
              </div>
            </div>
            {supplier.contract_end && (() => {
              const days = daysUntil(supplier.contract_end);
              const colorClass = days < 0 ? 'text-red-600' : days < 7 ? 'text-orange-600' : days < 30 ? 'text-yellow-600' : days < 60 ? 'text-yellow-500' : 'text-green-600';
              return (
                <p className={`text-xs font-medium tabular-nums ${colorClass}`}>
                  {days < 0
                    ? t('Contract expired {{days}} days ago', { days: Math.abs(days) })
                    : t('{{days}} days remaining', { days })}
                </p>
              );
            })()}
            {supplier.contract_start && supplier.contract_end && (() => {
              const months = Math.round((new Date(supplier.contract_end).getTime() - new Date(supplier.contract_start).getTime()) / (86_400_000 * 30.44));
              return (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {t('{{months}} months duration', { months })}
                </p>
              );
            })()}
            <Progress value={getContractProgress(supplier)} className="h-2" />
          </div>
          <Separator />
        </>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t('Payment & Orders')}</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('Terms')}:</span>
            <span>{supplier.payment_terms || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('Min. Order')}:</span>
            <span className="tabular-nums">{supplier.min_order_value ? formatCurrency(supplier.min_order_value, supplier.currency || 'EUR', locale) : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('Currency')}:</span>
            <span>{supplier.currency || 'EUR'}</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t('Bank Details')}</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('Bank')}:</span>
            <span>{supplier.bank_name || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('IBAN')}:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs">{showIban ? (supplier.iban || '-') : maskIban(supplier.iban)}</span>
              {supplier.iban && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowIban(!showIban)}
                  title={showIban ? t('Hide IBAN') : t('Show IBAN')}
                >
                  {showIban ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('BIC')}:</span>
            <span>{supplier.bic || '-'}</span>
          </div>
        </div>
      </div>

      {products.some(sp => sp.price_tiers && sp.price_tiers.length > 0) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="flex items-center gap-1 text-sm font-medium">
              <Layers className="h-4 w-4" /> {t('Volume Pricing')}
            </h4>
            {products.filter(sp => sp.price_tiers && sp.price_tiers.length > 0).map(sp => {
              const tiers = sp.price_tiers!;
              const maxPrice = Math.max(...tiers.map(tier => tier.pricePerUnit));
              return (
                <div key={sp.id} className="space-y-1">
                  <p className="text-xs font-medium">{getProductName(sp)}</p>
                  <div className="space-y-0.5">
                    {tiers.map((tier, i) => {
                      const savingsPercent = maxPrice > 0 ? Math.round((1 - tier.pricePerUnit / maxPrice) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center justify-between rounded border p-1 text-xs">
                          <span className="tabular-nums">{tier.minQty}{tier.maxQty ? `–${tier.maxQty}` : '+'}</span>
                          <span className="font-medium tabular-nums">{formatCurrency(tier.pricePerUnit, tier.currency, locale)}</span>
                          {savingsPercent > 0 && (
                            <Badge variant="secondary" className="h-4 bg-green-100 px-1 py-0 text-[10px] text-green-700">
                              -{savingsPercent}%
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
