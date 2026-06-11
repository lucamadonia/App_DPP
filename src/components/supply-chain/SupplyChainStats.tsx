import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPinned, Globe, Truck, Gauge } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { MiniBarRow } from '@/components/dashboard/MiniTrendChart';
import type { SupplyChainEntry } from '@/types/database';
import { TRANSPORT_CONFIG, Leaf } from '@/lib/supply-chain-constants';

interface SupplyChainStatsProps {
  entries: SupplyChainEntry[];
}

const TRANSPORT_BAR_CLASSES: Record<string, string> = {
  road: 'bg-orange-500',
  rail: 'bg-indigo-500',
  sea: 'bg-blue-500',
  air: 'bg-sky-400',
  multimodal: 'bg-teal-500',
};

/** Core fields a station needs for the completeness KPI */
const CORE_FIELDS = ['location', 'country', 'date', 'description', 'process_type', 'status'] as const;

/** KPI strip: stations, countries, emissions, transport mix, completeness */
export function SupplyChainStats({ entries }: SupplyChainStatsProps) {
  const { t } = useTranslation('settings');

  const stats = useMemo(() => {
    const total = entries.length;
    const countries = new Set(entries.map(e => e.country).filter(Boolean)).size;
    const totalEmissions = entries.reduce((sum, e) => sum + (e.emissions_kg || 0), 0);

    const transportCounts: Record<string, number> = {};
    entries.forEach(e => {
      if (e.transport_mode) {
        transportCounts[e.transport_mode] = (transportCounts[e.transport_mode] || 0) + 1;
      }
    });
    const withTransport = Object.values(transportCounts).reduce((s, n) => s + n, 0);

    const complete = entries.filter(e =>
      CORE_FIELDS.every(field => {
        const value = e[field];
        return value !== undefined && value !== null && String(value).trim() !== '';
      })
    ).length;
    const completeness = total > 0 ? Math.round((complete / total) * 100) : 0;

    return { total, countries, totalEmissions, transportCounts, withTransport, complete, completeness };
  }, [entries]);

  const transportSegments = useMemo(
    () =>
      Object.entries(TRANSPORT_CONFIG).map(([key, config]) => ({
        value: stats.transportCounts[key] || 0,
        className: TRANSPORT_BAR_CLASSES[key] || 'bg-muted-foreground',
        label: t(config.label),
      })),
    [stats.transportCounts, t]
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {/* Stations */}
      <div
        className="animate-in fade-in rounded-xl border bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4"
        style={{ animationDelay: '0ms' }}
      >
        <div className="mb-2 flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-blue-600" />
          <span className="truncate text-sm font-medium text-muted-foreground">{t('Stations')}</span>
        </div>
        <p className="text-2xl font-bold">
          <AnimatedCounter value={stats.total} />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('Supply Chain Steps')}</p>
      </div>

      {/* Countries */}
      <div
        className="animate-in fade-in rounded-xl border bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 p-4"
        style={{ animationDelay: '50ms' }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-indigo-600" />
          <span className="truncate text-sm font-medium text-muted-foreground">{t('Countries')}</span>
        </div>
        <p className="text-2xl font-bold text-indigo-600">
          <AnimatedCounter value={stats.countries} />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('involved')}</p>
      </div>

      {/* Total Emissions */}
      <div
        className="animate-in fade-in rounded-xl border bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4"
        style={{ animationDelay: '100ms' }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Leaf className="h-4 w-4 text-emerald-600" />
          <span className="truncate text-sm font-medium text-muted-foreground">{t('Total Emissions')}</span>
        </div>
        <p className="text-2xl font-bold text-emerald-600">
          <AnimatedCounter value={stats.totalEmissions} decimals={stats.totalEmissions % 1 !== 0 ? 1 : 0} />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('kg CO₂')}</p>
      </div>

      {/* Transport Mix */}
      <div
        className="animate-in fade-in rounded-xl border bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-4"
        style={{ animationDelay: '150ms' }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Truck className="h-4 w-4 text-orange-600" />
          <span className="truncate text-sm font-medium text-muted-foreground">{t('Transport Mix')}</span>
        </div>
        <p className="text-2xl font-bold text-orange-600">
          <AnimatedCounter value={stats.withTransport} />
        </p>
        {stats.withTransport > 0 ? (
          <MiniBarRow segments={transportSegments} className="mt-1.5" />
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">—</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{t('with transport')}</p>
      </div>

      {/* Completeness */}
      <div
        className="animate-in fade-in rounded-xl border bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4 col-span-2 sm:col-span-1"
        style={{ animationDelay: '200ms' }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-purple-600" />
          <span className="truncate text-sm font-medium text-muted-foreground">{t('Completeness')}</span>
        </div>
        <p className="text-2xl font-bold text-purple-600">
          <AnimatedCounter value={stats.completeness} suffix="%" />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('of {{total}}', { total: stats.total })} {t('with core data')}
        </p>
      </div>
    </div>
  );
}
