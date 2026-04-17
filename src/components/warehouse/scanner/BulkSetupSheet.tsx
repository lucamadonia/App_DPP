import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, MapPin, Check, Loader2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { QuantityStepper } from '@/components/warehouse/QuantityStepper';
import type { WhLocation } from '@/types/warehouse';

interface BulkSetupSheetProps {
  open: boolean;
  mode: 'in' | 'out';
  onConfirm: (locationId: string, locationName: string, quantity: number) => void;
  onClose: () => void;
}

const BULK_LAST_LOCATION_KEY = 'scanner-bulk-last-location';
const BULK_LAST_QTY_KEY = 'scanner-bulk-last-qty';

export function BulkSetupSheet({ open, mode, onConfirm, onClose }: BulkSetupSheetProps) {
  const { t } = useTranslation('warehouse');
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  const accentColor = mode === 'in' ? 'emerald' : 'blue';
  const ActionIcon = mode === 'in' ? ArrowDownToLine : ArrowUpFromLine;

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        setLoading(false);
        return;
      }
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
        tenantId,
        createdAt: '',
        updatedAt: '',
      })) as WhLocation[];

      setLocations(locs);
      setLoading(false);

      const lastLoc = localStorage.getItem(BULK_LAST_LOCATION_KEY);
      if (lastLoc && locs.some((l) => l.id === lastLoc)) {
        setLocationId(lastLoc);
      } else if (locs.length === 1) {
        setLocationId(locs[0].id);
      }

      const lastQty = localStorage.getItem(BULK_LAST_QTY_KEY);
      if (lastQty) {
        const n = parseInt(lastQty);
        if (n > 0) setQuantity(n);
      }
    })();
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return;
    localStorage.setItem(BULK_LAST_LOCATION_KEY, loc.id);
    localStorage.setItem(BULK_LAST_QTY_KEY, String(quantity));
    onConfirm(loc.id, loc.name, quantity);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg animate-sheet-up rounded-t-3xl sm:rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-6 pb-8 sm:pb-6">
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${accentColor}-500/20 relative`}>
            <ActionIcon className={`h-5 w-5 text-${accentColor}-400`} />
            <Zap className={`h-3 w-3 text-${accentColor}-400 absolute -top-1 -right-1`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('Setup Bulk Mode')}</h3>
            <p className="text-sm text-slate-400">{t('Select default location and quantity')}</p>
          </div>
        </div>

        <div className="mb-5">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
            <MapPin className="h-4 w-4" />
            {t('Default Location')}
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Loading locations')}...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setLocationId(loc.id)}
                  className={`text-left rounded-xl px-4 py-3 text-sm transition-all border ${
                    locationId === loc.id
                      ? `bg-${accentColor}-500/15 border-${accentColor}-500/40 text-${accentColor}-400 ring-1 ring-${accentColor}-500/20`
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <span className="font-semibold block truncate">{loc.name}</span>
                  {loc.code && <span className="text-xs opacity-60">{loc.code}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="text-sm font-medium text-slate-400 mb-2 block">{t('Default Quantity')}</label>
          <div className="[&_input]:!bg-white/5 [&_input]:!text-white [&_input]:!border-white/10">
            <QuantityStepper value={quantity} onChange={setQuantity} min={1} variant={mode === 'in' ? 'green' : 'default'} />
          </div>
        </div>

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
            disabled={!locationId || quantity < 1}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-${accentColor}-600 hover:bg-${accentColor}-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-${accentColor}-600/20`}
          >
            <Check className="h-4 w-4" />
            {t('Start Bulk Scanning')}
          </button>
        </div>
      </div>
    </div>
  );
}
