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
  getCountryZone,
  estimatePrices,
  requiredCustomsForms,
  recommendedIncoterms,
  transitTimeEstimate,
  applicableSurcharges,
  countryHints,
  type PackageInput,
  type CarrierMatch,
  type ContentItem,
  type CartonRecommendation,
  type ContentCategory,
} from '@/lib/smart-packing';
import { FileText, Globe, Coins, Clock, Flag, Percent } from 'lucide-react';

interface SmartPackingCardProps {
  /** Items to be packed together. */
  items: ContentItem[];
  /** Selected outer carton dimensions, if user already chose one. */
  selectedCarton?: { lengthCm: number; widthCm: number; heightCm: number };
  /** Total package weight in kg (including carton & padding). */
  packageWeightKg: number;
  /** Optional ISO-2 origin country (defaults to 'DE'). */
  originCountry?: string;
  /** Optional ISO-2 destination country — drives zones, prices, customs, hints. */
  destinationCountry?: string;
  /** Optional content category flags (Li-Ion, fragrance, etc.). */
  contents?: ContentCategory[];
  /** Optional declared goods value for customs-form thresholds. */
  declaredValueEur?: number;
  /** Whether shipment is B2C or B2B (drives Incoterm recommendation). */
  customerType?: 'b2c' | 'b2b';
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
  originCountry = 'DE',
  destinationCountry,
  contents = [],
  declaredValueEur = 0,
  customerType = 'b2c',
  onPickCarton,
  onPickService,
}: SmartPackingCardProps) {
  const { t } = useTranslation('warehouse');
  const [showAllServices, setShowAllServices] = useState(false);

  // Carton recommendations — items-driven
  const cartonRecs: CartonRecommendation[] = useMemo(
    () => (items.length > 0 ? recommendCarton(items) : []),
    [items],
  );

  const bestCarton = cartonRecs.find((c) => c.fits) ?? cartonRecs[0] ?? null;

  // Compute total weight from items (with 400 g packaging tare). This is the
  // authoritative weight we use IF the user hasn't typed an explicit override.
  const itemsTotalWeightKg = useMemo(
    () => items.reduce((sum, it) => sum + it.weightKg * (it.quantity ?? 1), 0),
    [items],
  );
  const computedGrossKg = itemsTotalWeightKg > 0 ? itemsTotalWeightKg + 0.4 : 0;

  /** Final weight: user-supplied (manual override) wins; else computed from items. */
  const effectiveWeightKg = packageWeightKg > 0 ? packageWeightKg : computedGrossKg;
  const usingComputedWeight = packageWeightKg <= 0 && computedGrossKg > 0;

  // Effective package dims: prefer user-selected carton, else recommended carton.
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
    if (!dim || effectiveWeightKg <= 0) return null;
    return {
      lengthCm: dim.lengthCm,
      widthCm: dim.widthCm,
      heightCm: dim.heightCm,
      weightKg: effectiveWeightKg,
      destinationCountry,
      contents,
    };
  }, [selectedCarton, bestCarton, effectiveWeightKg, destinationCountry, contents]);

  const carrierMatches: CarrierMatch[] = useMemo(
    () => (pkgInput ? matchCarrierServices(pkgInput) : []),
    [pkgInput],
  );

  const okMatches = carrierMatches.filter((m) => m.status === 'ok');
  const warnMatches = carrierMatches.filter((m) => m.status === 'warning');
  const blockedMatches = carrierMatches.filter((m) => m.status === 'blocked');

  /**
   * Group carrier services by carrier label and find the cheapest fitting tier
   * (the one the user should actually pick). The remaining tiers are shown as
   * a "ladder" so the user sees both the bottom and the headroom.
   */
  const carrierGroups = useMemo(() => {
    const groups: Record<string, CarrierMatch[]> = {};
    for (const m of carrierMatches) {
      const key = m.service.carrier;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    // For each group: sort tiers by maxWeightKg ascending; pick cheapest of the
    // ok/warning ones as "recommended".
    return Object.entries(groups)
      .map(([carrier, list]) => {
        const sorted = [...list].sort((a, b) => a.service.maxWeightKg - b.service.maxWeightKg);
        const fitting = sorted.filter((m) => m.status !== 'blocked');
        const cheapest = [...fitting].sort((a, b) => {
          const pa = a.service.priceFromEur ?? Infinity;
          const pb = b.service.priceFromEur ?? Infinity;
          return pa - pb;
        })[0];
        return {
          carrier,
          tiers: sorted,
          recommended: cheapest ?? null,
          anyFits: fitting.length > 0,
        };
      })
      .sort((a, b) => {
        // Carriers with at least one fit first; cheapest-recommended-price wins.
        if (a.anyFits && !b.anyFits) return -1;
        if (!a.anyFits && b.anyFits) return 1;
        const pa = a.recommended?.service.priceFromEur ?? Infinity;
        const pb = b.recommended?.service.priceFromEur ?? Infinity;
        return pa - pb;
      });
  }, [carrierMatches]);

  const ppwr = upcomingPpwrDeadlines();

  // Zone + price + customs + transit + hints — only when destination is known
  const destZone = getCountryZone(destinationCountry);
  const priceEstimates = useMemo(
    () => (effectiveWeightKg > 0 ? estimatePrices(originCountry, destinationCountry, effectiveWeightKg) : []),
    [originCountry, destinationCountry, effectiveWeightKg],
  );
  const customs = useMemo(
    () => requiredCustomsForms(originCountry, destinationCountry, declaredValueEur, effectiveWeightKg, customerType === 'b2b'),
    [originCountry, destinationCountry, declaredValueEur, effectiveWeightKg, customerType],
  );
  const incoterms = useMemo(
    () => recommendedIncoterms(destinationCountry, customerType, declaredValueEur),
    [destinationCountry, customerType, declaredValueEur],
  );
  const transits = useMemo(
    () => transitTimeEstimate(originCountry, destinationCountry),
    [originCountry, destinationCountry],
  );
  const hints = useMemo(() => countryHints(destinationCountry), [destinationCountry]);
  const surcharges = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    return applicableSurcharges({
      oversize: pkgInput
        ? pkgInput.lengthCm > 120 || pkgInput.widthCm > 60 || pkgInput.heightCm > 60
        : false,
      heavyOver25kg: effectiveWeightKg > 25,
      thirdCountry: destZone?.zone === 'third_country',
      peakSeason: month >= 11 || month === 1,
    });
  }, [pkgInput, effectiveWeightKg, destZone]);

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

  const totalContentsWeight = itemsTotalWeightKg;
  const hasWeight = effectiveWeightKg > 0;

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
        {/* Calculation breakdown — explains exactly where the weight comes from */}
        <section className={`rounded-xl border p-3 ${
          usingComputedWeight
            ? 'border-blue-500/25 bg-blue-500/5'
            : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-3.5 w-3.5 text-blue-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {t('Calculation')}
            </h3>
            {usingComputedWeight && (
              <span className="ml-auto rounded-full bg-blue-500/20 text-blue-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                {t('Auto')}
              </span>
            )}
          </div>
          <div className="space-y-1 text-[11px] font-mono text-slate-300">
            {items.map((it, i) => {
              const q = it.quantity ?? 1;
              const lineKg = it.weightKg * q;
              return (
                <div key={i} className="flex items-center justify-between">
                  <span className="truncate">
                    #{i + 1}: {q}× {it.lengthCm}×{it.widthCm}×{it.heightCm} cm @ {it.weightKg.toFixed(2)} kg
                  </span>
                  <span className="text-white">{lineKg.toFixed(2)} kg</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-white/10 pt-1 mt-1">
              <span>{t('Items subtotal')}</span>
              <span className="text-white font-semibold">{itemsTotalWeightKg.toFixed(2)} kg</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>+ {t('Packaging tare')}</span>
              <span>0,40 kg</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-1">
              <span className="font-semibold text-white">
                {usingComputedWeight ? t('Calculated gross') : t('Form override')}
              </span>
              <span className="text-white font-bold">{effectiveWeightKg.toFixed(2)} kg</span>
            </div>
            {bestCarton && (
              <div className="flex items-center justify-between text-slate-400 mt-1">
                <span>{t('Carton')}: {bestCarton.carton.label}</span>
                <span>{(bestCarton.fillPct).toFixed(0)}% {t('Fill')}</span>
              </div>
            )}
          </div>
        </section>

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

        {/* Per-carrier package recommendation with tier ladder */}
        {pkgInput && carrierGroups.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-3.5 w-3.5 text-blue-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('Recommended package per carrier')}
              </h3>
            </div>
            <ul className="space-y-2">
              {(showAllServices ? carrierGroups : carrierGroups.slice(0, 6)).map((group) => {
                const rec = group.recommended;
                if (!rec) {
                  return (
                    <li
                      key={group.carrier}
                      className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{group.carrier}</span>
                        <span className="rounded-full bg-rose-500/15 text-rose-300 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-rose-500/30">
                          {t('No fitting tier')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {t('Package exceeds max weight or dimensions for all of this carrier\u2019s services.')}
                      </p>
                    </li>
                  );
                }
                return (
                  <li
                    key={group.carrier}
                    className={`rounded-xl border p-3 transition-colors ${
                      rec.status === 'ok'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-amber-500/30 bg-amber-500/5'
                    }`}
                  >
                    {/* Recommendation headline */}
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{group.carrier}</span>
                          <span className="rounded-md bg-gradient-to-r from-blue-500 to-violet-500 text-white px-2 py-0.5 text-[10px] font-bold shadow">
                            {rec.service.service}
                          </span>
                          <span className="text-[10px] text-slate-500">{rec.service.region}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {t('Up to {{kg}} kg', { kg: rec.service.maxWeightKg })}
                          {rec.service.maxDim &&
                            ` · ${rec.service.maxDim.l}×${rec.service.maxDim.w}×${rec.service.maxDim.h} cm`}
                          {rec.service.maxLengthCm && !rec.service.maxDim &&
                            ` · ${t('max length')} ${rec.service.maxLengthCm} cm`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {rec.service.priceFromEur != null && (
                          <span className="text-sm font-mono font-bold text-white">
                            ab {rec.service.priceFromEur.toFixed(2).replace('.', ',')} €
                          </span>
                        )}
                        {statusPill(rec.status)}
                      </div>
                    </div>

                    {/* Tier ladder — all services from this carrier */}
                    {group.tiers.length > 1 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {group.tiers.map((tier) => {
                          const isRec = tier.service.id === rec.service.id;
                          const dot =
                            tier.status === 'ok' ? '✓' : tier.status === 'warning' ? '!' : '✗';
                          return (
                            <button
                              key={tier.service.id}
                              type="button"
                              onClick={() => onPickService?.(tier.service.id)}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                tier.status === 'blocked'
                                  ? 'bg-slate-800 text-slate-500 line-through cursor-not-allowed'
                                  : isRec
                                  ? 'bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-400'
                                  : tier.status === 'warning'
                                  ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30 hover:bg-amber-500/25'
                                  : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'
                              }`}
                              title={`${tier.service.service} — bis ${tier.service.maxWeightKg} kg${tier.service.priceFromEur ? `, ab ${tier.service.priceFromEur.toFixed(2)} €` : ''}`}
                              disabled={tier.status === 'blocked'}
                            >
                              <span className="opacity-60">{dot}</span>
                              {tier.service.service}
                              <span className="opacity-60">≤{tier.service.maxWeightKg}kg</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* First violation hint, if warning */}
                    {rec.violations.filter((v) => v.level !== 'info').slice(0, 2).map((v, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 text-[11px] text-slate-300 mt-1"
                      >
                        {violationIcon(v.level)}
                        <span className="leading-snug">{v.message}</span>
                      </div>
                    ))}

                    {/* Girth + volumetric footer */}
                    {(rec.girthCm != null || rec.volumetricWeightKg != null) && (
                      <div className="mt-1.5 text-[10px] text-slate-500 font-mono">
                        {rec.girthCm != null &&
                          rec.service.girth &&
                          `${t('Girth')} ${rec.girthCm}/${rec.service.girth.maxCm} cm`}
                        {rec.girthCm != null && rec.volumetricWeightKg != null && ' · '}
                        {rec.volumetricWeightKg != null &&
                          `${t('Volumetric')} ${rec.volumetricWeightKg.toFixed(1)} kg`}
                      </div>
                    )}

                    {/* Pick action */}
                    {onPickService && (
                      <button
                        type="button"
                        onClick={() => onPickService(rec.service.id)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-blue-200 font-semibold transition-colors"
                      >
                        {t('Use this tier')} →
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {carrierGroups.length > 6 && (
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
                    <ChevronDown className="h-3 w-3" /> {t('Show all {{n}} carriers', { n: carrierGroups.length })}
                  </>
                )}
              </button>
            )}
          </section>
        )}

        {/* Destination zone banner */}
        {destZone && (
          <section
            className={`rounded-xl border p-3 ${
              destZone.zone === 'third_country'
                ? 'border-amber-500/30 bg-amber-500/10'
                : destZone.zone === 'special_zone'
                ? 'border-orange-500/30 bg-orange-500/10'
                : 'border-emerald-500/20 bg-emerald-500/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Globe className={`h-3.5 w-3.5 ${destZone.zone === 'third_country' ? 'text-amber-400' : 'text-emerald-400'}`} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                {destZone.nameDe} ({destZone.iso2})
              </h3>
              <span className={`ml-auto text-[10px] font-bold uppercase ${destZone.zone === 'third_country' ? 'text-amber-300' : 'text-emerald-300'}`}>
                {destZone.zone === 'third_country'
                  ? t('Third country')
                  : destZone.zone === 'eea_non_eu'
                  ? 'EEA'
                  : 'EU'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              {t('VAT')}: {destZone.vatStandardPct}%
              {destZone.vatReducedPct != null ? ` / ${destZone.vatReducedPct}%` : ''} ·{' '}
              {t('Currency')}: {destZone.currency}
              {destZone.dutiesRequired ? ` · ${t('Duties required')}` : ''}
            </p>
            {hints.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {hints.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-snug">
                    <span className="flex-shrink-0 mt-0.5 text-amber-400">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Price estimates */}
        {priceEstimates.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-3.5 w-3.5 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('Price estimate')}
              </h3>
              <span className="ml-auto text-[10px] text-slate-500 italic">
                ~{packageWeightKg.toFixed(1)} kg {originCountry} → {destinationCountry}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {priceEstimates.slice(0, 6).map((p, i) => (
                <div
                  key={p.carrier}
                  className={`rounded-lg border p-2 ${
                    i === 0
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-white truncate">{p.carrier}</span>
                    {i === 0 && (
                      <span className="text-[8px] font-bold text-emerald-300">★</span>
                    )}
                  </div>
                  <div className="text-sm font-mono font-semibold text-white mt-0.5">
                    {p.currency === 'CHF' ? 'CHF ' : p.currency === 'GBP' ? '£' : '€'}
                    {p.priceFrom.toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-[9px] text-slate-500">{p.weightTierUsed}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 italic mt-2">
              {t('Prices exclude customs, duties, fuel surcharge, island/peak. ±15–25% accuracy.')}
            </p>
          </section>
        )}

        {/* Customs forms */}
        {customs.needed && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200">
                {t('Customs forms required')}
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 mb-2">{customs.reason}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {customs.forms.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 text-amber-200 px-2 py-0.5 text-[10px] font-semibold ring-1 ring-amber-500/40"
                >
                  <FileText className="h-3 w-3" />
                  {f}
                </span>
              ))}
            </div>
            {customs.hints.length > 0 && (
              <ul className="space-y-0.5 mt-2">
                {customs.hints.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400 leading-snug">
                    <span className="flex-shrink-0 mt-0.5 text-amber-400">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Incoterms recommendation */}
        {incoterms.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Flag className="h-3.5 w-3.5 text-violet-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('Recommended Incoterms')}
              </h3>
            </div>
            <div className="space-y-1.5">
              {incoterms.map((inc) => (
                <div
                  key={inc.code}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-violet-500/20 text-violet-200 px-2 py-0.5 text-[10px] font-bold ring-1 ring-violet-500/40">
                      {inc.code}
                    </span>
                    <span className="text-xs font-semibold text-white">{inc.labelDe}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 leading-snug">{inc.typicalUse}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transit time */}
        {transits.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('Transit time estimate')}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {transits.map((t2) => (
                <div
                  key={t2.carrier}
                  className="rounded-lg border border-white/10 bg-white/5 p-2"
                >
                  <div className="text-[10px] text-slate-400 truncate">{t2.carrier}</div>
                  <div className="text-sm font-semibold text-white">{t2.days} {t('days')}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Surcharges */}
        {surcharges.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-3.5 w-3.5 text-rose-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {t('Applicable surcharges')}
              </h3>
            </div>
            <ul className="space-y-1">
              {surcharges.map(({ rule }) => (
                <li
                  key={rule.id}
                  className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2 py-1.5"
                >
                  <AlertTriangle className="h-3 w-3 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-white">{rule.labelDe}</div>
                    <div className="text-[10px] text-slate-400 truncate">{rule.note}</div>
                  </div>
                  <div className="text-[10px] text-rose-300 font-mono text-right flex-shrink-0">
                    {Object.entries(rule.amounts)
                      .slice(0, 3)
                      .map(([c, v]) => `${c}: ${typeof v === 'number' ? `€${v}` : v}`)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
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
