import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ClipboardCheck, Loader2 } from 'lucide-react';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhLocation } from '@/types/warehouse';

interface StocktakeLocationSheetProps {
  open: boolean;
  onSelect: (location: WhLocation) => void;
  onClose: () => void;
}

export function StocktakeLocationSheet({ open, onSelect, onClose }: StocktakeLocationSheetProps) {
  const { t } = useTranslation('warehouse');
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [loading, setLoading] = useState(true);

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

      setLocations(
        (data || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.name as string,
          code: (r.code as string) || undefined,
          type: r.type as WhLocation['type'],
          isActive: r.is_active as boolean,
          zones: (r.zones || []) as WhLocation['zones'],
          tenantId,
          createdAt: '',
          updatedAt: '',
        })) as WhLocation[]
      );
      setLoading(false);
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg animate-sheet-up rounded-t-3xl sm:rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-6 pb-8 sm:pb-6">
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <ClipboardCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('Select Location for Stocktake')}</h3>
            <p className="text-sm text-slate-400">{t('Inventory count for selected location')}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('Loading locations')}...
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-8">
            {t('No locations available')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => onSelect(loc)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left bg-white/5 border border-white/5 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 transition-all"
              >
                <MapPin className="h-4 w-4 shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{loc.name}</div>
                  {loc.code && <div className="text-xs opacity-60">{loc.code}</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
        >
          {t('Cancel', { ns: 'common' })}
        </button>
      </div>
    </div>
  );
}
