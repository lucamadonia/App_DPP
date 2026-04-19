import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Ruler,
  Scale,
  Box,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import {
  matchCarrierServices,
  recommendCarton,
  upcomingPpwrDeadlines,
  type PackageInput,
  type CarrierMatch,
  type ContentItem,
  type CartonRecommendation,
  type ContentCategory,
} from '@/lib/smart-packing';

interface SmartPackingCardProps {
  /** Items to be packed together. */
  items: ContentItem[];
  /** Selected outer carton dimensions, if user already chose one. */
  selectedCarton?: { lengthCm: number; widthCm: number; heightCm: number };
  /** Total package weight in kg (including carton & padding). */
  packageWeightKg: number;
  /** Optional ISO-2 destination country — filters carriers. */
  destinationCountry?: string;
  /** Optional content category flags (Li-Ion, fragrance, etc.). */
  contents?: ContentCategory[];
  /** Optional user-selected carton ID to highlight. */
  onPickCarton?: (cartonId: string) => void;
  /** Optional user-selected carrier service ID. */
  onPickService?: (serviceId: string) => void;
}

function statusPill(status: CarrierMatch['status']) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" /> Passt
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-amber-500/30">
        <AlertTriangle className="h-3 w-3" /> Achtung
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 text-rose-300 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-rose-500/30">
      <XCircle className="h-3 w-3" /> Blockiert
    </span>
  );
}

function violationIcon(level: 'hard_fail' | 'warning' | 'info') {
  if (level === 'hard_fail') return <XCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />;
  if (level === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />;
  return <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />;
}

export function SmartPackingCard({
  items,
  selectedCarton,
  packageWeightKg,
  destinationCountry,
  contents = [],
  onPickCarton,
  onPickService,
}: SmartPackingCardProps) {
  const { t } = useTranslation('warehouse');
  const [showAllServices, setShowAllServices] = useState(false);

  // Carton recommendations
  const cartonRecs: CartonRecommendation[] = useMemo(
    () => (items.length > 0 ? recommendCarton(items) : []),
    [items],
  );

  const bestCarton = cartonRecs.find((c) => c.fits) ?? cartonRecs[0] ?? null;

  // Effective package dims: prefer user-selected carton, else bestCarton, else bounding box
  const pkgInput: PackageInput | null = useMemo(() => {
    const dim =
      selectedCarton ??
      (bestCarton?.fits
        ? {
            lengthCm: bestCarton.carton.lengthCm,
            widthCm: bestCarton.carton.widthCm,
            heightCm: bestCarton.carton.heightCm,
          }
        : null);
    if (!dim || packageWeightKg <= 0) return null;
    return {
      lengthCm: dim.lengthCm,
      widthCm: dim.widthCm,
      heightCm: dim.heightCm,
      weightKg: packageWeightKg,
      destinationCountry,
      contents,
    };
  }, [selectedCarton, bestCarton, packageWeightKg, destinationCountry, contents]);

  const carrierMatches: CarrierMatch[] = useMemo(
    () => (pkgInput ? matchCarrierServices(pkgInput) : []),
    [pkgInput],
  );

  const okMatches = carrierMatches.filter((m) => m.status === 'ok');
  const warnMatches = carrierMatches.filter((m) => m.status === 'warning');
  const blockedMatches = carrierMatches.filter((m) => m.status === 'blocked');

  const visibleMatches = showAllServices ? carrierMatches : carrierMatches.slice(0, 6);

  const ppwr = upcomingPpwrDeadlines();

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-white">{t('Smart Packing Assistant')}</span>
        </div>
        {t('Add items to get carton size and carrier suggestions.')}
      </div>
    );
  }

  const totalContentsWeight = items.reduce((sum, it) => sum + it.weightKg * (it.quantity ?? 1), 0);
  const hasWeight = packageWeightKg > 0;

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-blue-500/5 to-slate-900/40 shadow-lg shadow-violet-500/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{t('Smart Packing Assistant')}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {t('{{n}} items · {{kg}} kg contents', {
                n: items.length,
                kg: totalContentsWeight.toFixed(1),
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-300 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-emerald-500/30">
            {okMatches.length} OK
          </span>
          {warnMatches.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-300 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-amber-500/30">
              {warnMatches.length} ⚠
            </span>
          )}
          {blockedMatches.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-300 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-rose-500/30">
              {blockedMatches.length} ✗
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Carton Recommendations */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Box className="h-3.5 w-3.5 text-violet-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('Recommended carton')}
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cartonRecs.slice(0, 6).map((rec) => {
              const isBest = rec === bestCarton && rec.fits;
              return (
                <button
                  key={rec.carton.id}
                  type="button"
                  onClick={() => onPickCarton?.(rec.carton.id)}
                  className={`relative rounded-xl border p-2.5 text-left transition-all ${
                    !rec.fits
                      ? 'border-rose-500/30 bg-rose-500/5 opacity-60'
                      : isBest
                      ? 'border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {isBest && (
                    <span className="absolute -top-1.5 -right-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
                      {t('BEST')}
                    </span>
                  )}
                  <p className="text-xs font-semibold text-white">{rec.carton.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ≤ {rec.carton.maxLoadKg} kg · {t('Fill')}: {rec.fillPct.toFixed(0)}%
                  </p>
                  {!rec.fits && rec.reason && (
                    <p className="text-[9px] text-rose-400 mt-1 leading-tight">{rec.reason}</p>
                  )}
                  {rec.fits && rec.fillPct > 95 && (
                    <p className="text-[9px] text-amber-300 mt-1">
                      {t('Very tight fit — allow room for padding')}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Package facts */}
        {pkgInput && (
          <section className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
                <Ruler className="h-3 w-3" /> L×B×H
              </div>
              <div className="text-xs font-semibold text-white mt-0.5">
                {pkgInput.lengthCm}×{pkgInput.widthCm}×{pkgInput.heightCm} cm
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
                <Scale className="h-3 w-3" /> {t('Gross')}
              </div>
              <div className={`text-xs font-semibold mt-0.5 ${hasWeight ? 'text-white' : 'text-amber-300'}`}>
                {hasWeight ? `${pkgInput.weightKg.toFixed(1)} kg` : t('Set weight')}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-slate-500">
                <Package className="h-3 w-3" /> {t('Volume')}
              </div>
              <div className="text-xs font-semibold text-white mt-0.5">
                {((pkgInput.lengthCm * pkgInput.widthCm * pkgInput.heightCm) / 1000).toFixed(1)} L
              </div>
            </div>
          </section>
        )}

        {/* Carrier Services */}
        {pkgInput && carrierMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-3.5 w-3.5 text-blue-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('Carrier matches')}
              </h3>
            </div>
            <ul className="space-y-1.5">
              {visibleMatches.map((match) => (
                <li
                  key={match.service.id}
                  className={`rounded-xl border p-2.5 transition-colors ${
                    match.status === 'ok'
                      ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                      : match.status === 'warning'
                      ? 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                      : 'border-rose-500/20 bg-rose-500/5 opacity-80'
                  } ${onPickService ? 'cursor-pointer' : ''}`}
                  onClick={() => onPickService?.(match.service.id)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-white truncate">
                        {match.service.carrier}
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {match.service.service}
                      </span>
                      <span className="text-[10px] text-slate-500">· {match.service.region}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {match.service.priceFromEur != null && (
                        <span className="text-[10px] font-mono text-slate-400">
                          ab {match.service.priceFromEur.toFixed(2).replace('.', ',')} €
                        </span>
                      )}
                      {statusPill(match.status)}
                    </div>
                  </div>
                  {match.violations.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {match.violations.slice(0, 3).map((v, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                          {violationIcon(v.level)}
                          <span className="leading-snug">{v.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {match.girthCm != null && match.service.girth && (
                    <div className="mt-1 text-[10px] text-slate-500 font-mono">
                      {t('Girth')}: {match.girthCm} / {match.service.girth.maxCm} cm
                      {match.volumetricWeightKg != null &&
                        ` · ${t('Volumetric')}: ${match.volumetricWeightKg.toFixed(1)} kg`}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {carrierMatches.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllServices((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                {showAllServices ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> {t('Show fewer')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> {t('Show all {{n}} services', { n: carrierMatches.length })}
                  </>
                )}
              </button>
            )}
          </section>
        )}

        {/* PPWR Compliance Info */}
        {ppwr.length > 0 && (
          <section className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                {t('EU PPWR upcoming')}
              </h3>
            </div>
            <ul className="space-y-1">
              {ppwr.slice(0, 2).map((d) => (
                <li key={d.date} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="font-mono text-blue-300 flex-shrink-0">{d.date}</span>
                  <span className="leading-snug">{d.description}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
