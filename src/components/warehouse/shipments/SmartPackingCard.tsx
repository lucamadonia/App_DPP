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

  // Zone + price + customs + transit + hints — only when destination is known
  const destZone = getCountryZone(destinationCountry);
  const priceEstimates = useMemo(
    () => (packageWeightKg > 0 ? estimatePrices(originCountry, destinationCountry, packageWeightKg) : []),
    [originCountry, destinationCountry, packageWeightKg],
  );
  const customs = useMemo(
    () => requiredCustomsForms(originCountry, destinationCountry, declaredValueEur, packageWeightKg, customerType === 'b2b'),
    [originCountry, destinationCountry, declaredValueEur, packageWeightKg, customerType],
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
      heavyOver25kg: packageWeightKg > 25,
      thirdCountry: destZone?.zone === 'third_country',
      peakSeason: month >= 11 || month === 1,
    });
  }, [pkgInput, packageWeightKg, destZone]);

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
