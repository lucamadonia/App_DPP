import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, MapPin, Check, Loader2 } from 'lucide-react';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { QuantityStepper } from '@/components/warehouse/QuantityStepper';
import type { ScannerProduct, ScannerBatch } from '@/services/supabase/wh-scanner';
import type { WhLocation } from '@/types/warehouse';

interface QuickReceiptSheetProps {
  open: boolean;
  product: ScannerProduct;
  batch: ScannerBatch;
  onConfirm: (locationId: string, locationName: string, quantity: number) => Promise<void>;
  onClose: () => void;
}

const LAST_LOCATION_KEY = 'scanner-last-location';

export function QuickReceiptSheet({ open, product, batch, onConfirm, onClose }: QuickReceiptSheetProps) {
  const { t } = useTranslation('warehouse');
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Load locations
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingLocations(true);
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;
      const { data } = await supabase
        .from('wh_locations')
        .select('id, name, code, type, is_active, zones')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      const locs = (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        code: (r.code as string) || undefined,
        type: r.type as WhLocation['type'],
        isActive: r.is_active as boolean,
        zones: (r.zones || []) as WhLocation['zones'],
        tenantId: tenantId,
        createdAt: '',
        updatedAt: '',
      })) as WhLocation[];

      setLocations(locs);
      setLoadingLocations(false);

      // Restore last used location
      const lastLoc = localStorage.getItem(LAST_LOCATION_KEY);
      if (lastLoc && locs.some(l => l.id === lastLoc)) {
        setLocationId(lastLoc);
      } else if (locs.length === 1) {
        setLocationId(locs[0].id);
      }
    })();
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!locationId || quantity < 1) return;
    setSubmitting(true);
    try {
      const loc = locations.find(l => l.id === locationId);
      localStorage.setItem(LAST_LOCATION_KEY, locationId);
      await onConfirm(locationId, loc?.name || '', quantity);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg animate-sheet-up rounded-t-3xl sm:rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-6 pb-8 sm:pb-6">
        {/* Handle bar */}
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('Quick Receipt')}</h3>
            <p className="text-sm text-slate-400">{product.name} — {batch.serialNumber}</p>
          </div>
        </div>

        {/* Location selector */}
        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
            <MapPin className="h-4 w-4" />
            {t('Location')}
          </label>
          {loadingLocations ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Loading locations')}...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {locations.map(loc => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setLocationId(loc.id)}
                  className={`
                    text-left rounded-xl px-4 py-3 text-sm transition-all border
                    ${locationId === loc.id
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 ring-1 ring-emerald-500/20'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                    }
                  `}
                >
                  <span className="font-semibold block truncate">{loc.name}</span>
                  {loc.code && <span className="text-xs opacity-60">{loc.code}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-400 mb-2 block">{t('Quantity')}</label>
          <div className="[&_input]:!bg-white/5 [&_input]:!text-white [&_input]:!border-white/10 [&_button]:!text-emerald-400 [&_button]:hover:!bg-emerald-500/10">
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} variant="green" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            {t('Cancel', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!locationId || quantity < 1 || submitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-600/20"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t('Confirm Receipt')}
          </button>
        </div>
      </div>
    </div>
  );
}
