import { useMemo, useState, type ReactNode } from 'react';
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
  Star,
} from 'lucide-react';
import {
  matchCarrierServices,
  recommendCarton,
  CARTON_TARE_KG,
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
  /**
   * Real tare weight of the (default/selected) outer carton in kg, e.g.
   * wh_packaging_types.tare_weight_grams / 1000. Falls back to the 0.4 kg
   * flat rate when not provided.
   */
  packagingTareKg?: number;
  /** Optional user-selected carton ID to highlight. */
  onPickCarton?: (cartonId: string) => void;
  /** Optional user-selected carrier service ID. */
  onPickService?: (serviceId: string) => void;
}

/** Small neutral pill with a status dot — color only on the dot, where it carries meaning. */
const pillBase = 'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium text-foreground';

function statusPill(status: CarrierMatch['status']) {
  if (status === 'ok') {
    return (
      <span className={pillBase}>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" aria-hidden="true" /> Passt
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className={pillBase}>
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" aria-hidden="true" /> Achtung
      </span>
    );
  }
  return (
    <span className={pillBase}>
      <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /> Blockiert
    </span>
  );
}

function violationIcon(level: 'hard_fail' | 'warning' | 'info') {
  if (level === 'hard_fail') return <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />;
  if (level === 'warning') return <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />;
  return <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

/** Section heading used throughout the card — one size, one weight, muted icon. */
function SubHeading({ icon: Icon, children, aside }: { icon: typeof Info; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-sm font-medium text-foreground">{children}</h3>
      {aside && <span className="ml-auto text-xs text-muted-foreground">{aside}</span>}
    </div>
  );
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
  packagingTareKg,
  onPickCarton,
  onPickService,
}: SmartPackingCardProps) {
  const { t } = useTranslation('warehouse');
  const [showAllServices, setShowAllServices] = useState(false);

  // Split items by whether dimensions are set. Only dim'd items are used for
  // the carton/carrier calculations; weight is summed across ALL items.
  const itemsWithDims = useMemo(
    () => items.filter((it) => it.lengthCm > 0 && it.widthCm > 0 && it.heightCm > 0),
    [items],
  );
  const itemsMissingDims = items.length - itemsWithDims.length;

  // Real carton tare when known (wh_packaging_types), 0.4 kg flat fallback.
  const tareKg = packagingTareKg != null && packagingTareKg > 0 ? packagingTareKg : CARTON_TARE_KG;

  // Carton recommendations — only items with dimensions contribute.
  const cartonRecs: CartonRecommendation[] = useMemo(
    () => (itemsWithDims.length > 0 ? recommendCarton(itemsWithDims, tareKg) : []),
    [itemsWithDims, tareKg],
  );

  const bestCarton = cartonRecs.find((c) => c.fits) ?? cartonRecs[0] ?? null;

  // Compute total weight from items (plus carton tare). This is the
  // authoritative weight we use IF the user hasn't typed an explicit override.
  const itemsTotalWeightKg = useMemo(
    () => items.reduce((sum, it) => sum + it.weightKg * (it.quantity ?? 1), 0),
    [items],
  );
  const computedGrossKg = itemsTotalWeightKg > 0 ? itemsTotalWeightKg + tareKg : 0;

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
      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-semibold text-foreground">{t('Smart Packing Assistant')}</span>
        </div>
        {t('Add items to get carton size and carrier suggestions.')}
      </div>
    );
  }

  const totalContentsWeight = itemsTotalWeightKg;
  const hasWeight = effectiveWeightKg > 0;

  return (
    <div className="rounded-xl border bg-card text-card-foreground">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="flex min-w-0 items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-5 text-foreground">{t('Smart Packing Assistant')}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {t('{{n}} items · {{kg}} kg contents', {
                n: items.length,
                kg: totalContentsWeight.toFixed(1),
              })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`${pillBase} tabular-nums`}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {okMatches.length} OK
          </span>
          {warnMatches.length > 0 && (
            <span className={`${pillBase} tabular-nums`}>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" aria-hidden="true" />
              {warnMatches.length}
            </span>
          )}
          {blockedMatches.length > 0 && (
            <span className={`${pillBase} tabular-nums`}>
              <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
              {blockedMatches.length}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
        {/* Calculation breakdown — explains exactly where the weight comes from */}
        <section className="rounded-lg border bg-muted/30 p-3 sm:p-4">
          <SubHeading
            icon={Scale}
            aside={usingComputedWeight ? t('Auto') : undefined}
          >
            {t('Calculation')}
          </SubHeading>
          {/* Sanity warning: a single item over 50 kg almost always means a
              unit mismatch in the underlying product/batch master data. */}
          {items.some((it) => it.weightKg > 50) && (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs leading-snug text-muted-foreground">
              <strong className="mb-0.5 flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t('Suspicious weight detected')}
              </strong>
              {t('An item is over 50 kg per unit. Check the batch form: the field expects grams (g), not kilograms. A 1.27 kg product should be entered as 1270.')}
            </div>
          )}

          {/* Missing-dimensions warning: some items lack L/W/H and are
              excluded from the carton suggestion. Weight still counts. */}
          {itemsMissingDims > 0 && (
            <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-snug text-muted-foreground">
              <strong className="mb-0.5 flex items-center gap-1.5 font-medium text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
                {t('{{n}} items without dimensions', { n: itemsMissingDims })}
              </strong>
              {t('Carton and carrier fit calculations use only items with L×W×H set. Their weight still counts. Add dimensions on the product or batch to include them.')}
            </div>
          )}
          <div className="space-y-1 text-xs tabular-nums text-muted-foreground">
            {items.map((it, i) => {
              const q = it.quantity ?? 1;
              const lineKg = it.weightKg * q;
              const flag = it.weightKg > 50;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-3 ${flag ? 'text-destructive' : ''}`}
                >
                  <span className="truncate">
                    #{i + 1}: {q}× {it.lengthCm}×{it.widthCm}×{it.heightCm} cm @ {it.weightKg.toFixed(2)} kg
                    {flag && <AlertTriangle className="-mt-0.5 ml-1 inline-block h-3 w-3" aria-hidden="true" />}
                  </span>
                  <span className={`shrink-0 ${flag ? 'text-destructive' : 'text-foreground'}`}>{lineKg.toFixed(2)} kg</span>
                </div>
              );
            })}
            <div className="mt-1.5 flex items-center justify-between gap-3 border-t pt-1.5">
              <span>{t('Items subtotal')}</span>
              <span className="text-foreground">{itemsTotalWeightKg.toFixed(2)} kg</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>+ {t('Packaging tare')}</span>
              <span>{tareKg.toFixed(2).replace('.', ',')} kg</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-1.5 text-sm">
              <span className="font-medium text-foreground">
                {usingComputedWeight ? t('Calculated gross') : t('Form override')}
              </span>
              <span className="font-medium text-foreground">{effectiveWeightKg.toFixed(2)} kg</span>
            </div>
            {bestCarton && (
              <div className="mt-1 flex items-center justify-between gap-3">
                <span>{t('Carton')}: {bestCarton.carton.label}</span>
                <span>{(bestCarton.fillPct).toFixed(0)}% {t('Fill')}</span>
              </div>
            )}
          </div>
        </section>

        {/* Carton Recommendations */}
        <section>
          <SubHeading icon={Box}>{t('Recommended carton')}</SubHeading>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cartonRecs.slice(0, 6).map((rec) => {
              const isBest = rec === bestCarton && rec.fits;
              return (
                <button
                  key={rec.carton.id}
                  type="button"
                  onClick={() => onPickCarton?.(rec.carton.id)}
                  aria-pressed={isBest}
                  className={`min-h-11 rounded-lg border p-3 text-left transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] ${
                    !rec.fits
                      ? 'border-border bg-card opacity-60'
                      : isBest
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{rec.carton.label}</p>
                    {isBest && (
                      <span className="shrink-0 text-xs font-medium text-primary">
                        {t('BEST')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    ≤ {rec.carton.maxLoadKg} kg · {t('Fill')}: {rec.fillPct.toFixed(0)}%
                  </p>
                  {!rec.fits && rec.reason && (
                    <p className="mt-1 text-xs leading-tight text-destructive">{rec.reason}</p>
                  )}
                  {rec.fits && rec.fillPct > 95 && (
                    <p className="mt-1 text-xs leading-tight text-amber-700 dark:text-amber-500">
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
          <section className="grid grid-cols-3 divide-x rounded-lg border">
            <div className="min-w-0 px-2 py-3 text-center sm:px-3">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Ruler className="h-3.5 w-3.5" aria-hidden="true" /> L×B×H
              </div>
              <div className="mt-1 text-sm font-medium tabular-nums text-foreground [overflow-wrap:anywhere]">
                {pkgInput.lengthCm}×{pkgInput.widthCm}×{pkgInput.heightCm} cm
              </div>
            </div>
            <div className="min-w-0 px-2 py-3 text-center sm:px-3">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Scale className="h-3.5 w-3.5" aria-hidden="true" /> {t('Gross')}
              </div>
              <div className={`mt-1 text-sm font-medium tabular-nums ${hasWeight ? 'text-foreground' : 'text-amber-700 dark:text-amber-500'}`}>
                {hasWeight ? `${pkgInput.weightKg.toFixed(1)} kg` : t('Set weight')}
              </div>
            </div>
            <div className="min-w-0 px-2 py-3 text-center sm:px-3">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" aria-hidden="true" /> {t('Volume')}
              </div>
              <div className="mt-1 text-sm font-medium tabular-nums text-foreground">
                {((pkgInput.lengthCm * pkgInput.widthCm * pkgInput.heightCm) / 1000).toFixed(1)} L
              </div>
            </div>
          </section>
        )}

        {/* Per-carrier package recommendation with tier ladder */}
        {pkgInput && carrierGroups.length > 0 && (
          <section>
            <SubHeading icon={Package}>{t('Recommended package per carrier')}</SubHeading>
            <ul className="divide-y rounded-lg border">
              {(showAllServices ? carrierGroups : carrierGroups.slice(0, 6)).map((group) => {
                const rec = group.recommended;
                if (!rec) {
                  return (
                    <li key={group.carrier} className="p-3 sm:p-4">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{group.carrier}</span>
                        <span className={pillBase}>
                          <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                          {t('No fitting tier')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('Package exceeds max weight or dimensions for all of this carrier’s services.')}
                      </p>
                    </li>
                  );
                }
                return (
                  <li key={group.carrier} className="p-3 sm:p-4">
                    {/* Recommendation headline */}
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium text-foreground">{group.carrier}</span>
                          <span className="rounded border px-1.5 py-0.5 text-xs text-foreground">
                            {rec.service.service}
                          </span>
                          <span className="text-xs text-muted-foreground">{rec.service.region}</span>
                        </div>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {t('Up to {{kg}} kg', { kg: rec.service.maxWeightKg })}
                          {rec.service.maxDim &&
                            ` · ${rec.service.maxDim.l}×${rec.service.maxDim.w}×${rec.service.maxDim.h} cm`}
                          {rec.service.maxLengthCm && !rec.service.maxDim &&
                            ` · ${t('max length')} ${rec.service.maxLengthCm} cm`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {rec.service.priceFromEur != null && (
                          <span className="text-sm font-medium tabular-nums text-foreground">
                            ab {rec.service.priceFromEur.toFixed(2).replace('.', ',')} €
                          </span>
                        )}
                        {statusPill(rec.status)}
                      </div>
                    </div>

                    {/* Tier ladder — all services from this carrier */}
                    {group.tiers.length > 1 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {group.tiers.map((tier) => {
                          const isRec = tier.service.id === rec.service.id;
                          const dot =
                            tier.status === 'ok' ? '✓' : tier.status === 'warning' ? '!' : '✗';
                          return (
                            <button
                              key={tier.service.id}
                              type="button"
                              onClick={() => onPickService?.(tier.service.id)}
                              className={`inline-flex min-h-8 items-center gap-1 rounded-md border px-2 py-1 text-xs tabular-nums transition-[background-color,border-color,color] duration-150 ease-out ${
                                tier.status === 'blocked'
                                  ? 'cursor-not-allowed border-border text-muted-foreground/60 line-through'
                                  : isRec
                                  ? 'border-primary bg-primary/5 font-medium text-foreground'
                                  : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              }`}
                              title={`${tier.service.service} — bis ${tier.service.maxWeightKg} kg${tier.service.priceFromEur ? `, ab ${tier.service.priceFromEur.toFixed(2)} €` : ''}`}
                              disabled={tier.status === 'blocked'}
                            >
                              <span className={tier.status === 'warning' ? 'text-amber-600 dark:text-amber-500' : 'opacity-60'}>{dot}</span>
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
                        className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"
                      >
                        {violationIcon(v.level)}
                        <span className="leading-snug">{v.message}</span>
                      </div>
                    ))}

                    {/* Girth + volumetric footer */}
                    {(rec.girthCm != null || rec.volumetricWeightKg != null) && (
                      <div className="mt-1.5 text-xs tabular-nums text-muted-foreground">
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
                        className="-ml-1 mt-1.5 inline-flex min-h-9 items-center gap-1 rounded-md px-1 text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
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
                className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
              >
                {showAllServices ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> {t('Show fewer')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> {t('Show all {{n}} carriers', { n: carrierGroups.length })}
                  </>
                )}
              </button>
            )}
          </section>
        )}

        {/* Destination zone banner */}
        {destZone && (
          <section
            className={`rounded-lg border p-3 sm:p-4 ${
              destZone.zone === 'third_country' || destZone.zone === 'special_zone'
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'bg-muted/30'
            }`}
          >
            <SubHeading
              icon={Globe}
              aside={
                destZone.zone === 'third_country'
                  ? t('Third country')
                  : destZone.zone === 'eea_non_eu'
                  ? 'EEA'
                  : 'EU'
              }
            >
              {destZone.nameDe} ({destZone.iso2})
            </SubHeading>
            <p className="-mt-1.5 text-xs leading-snug tabular-nums text-muted-foreground">
              {t('VAT')}: {destZone.vatStandardPct}%
              {destZone.vatReducedPct != null ? ` / ${destZone.vatReducedPct}%` : ''} ·{' '}
              {t('Currency')}: {destZone.currency}
              {destZone.dutiesRequired ? ` · ${t('Duties required')}` : ''}
            </p>
            {hints.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs leading-snug text-muted-foreground">
                {hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Price estimates */}
        {priceEstimates.length > 0 && (
          <section>
            <SubHeading
              icon={Coins}
              aside={<span className="tabular-nums">~{packageWeightKg.toFixed(1)} kg {originCountry} → {destinationCountry}</span>}
            >
              {t('Price estimate')}
            </SubHeading>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {priceEstimates.slice(0, 6).map((p, i) => (
                <div
                  key={p.carrier}
                  className={`rounded-lg border p-3 ${
                    i === 0 ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs text-muted-foreground">{p.carrier}</span>
                    {i === 0 && (
                      <Star className="h-3 w-3 shrink-0 fill-primary text-primary" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {p.currency === 'CHF' ? 'CHF ' : p.currency === 'GBP' ? '£' : '€'}
                    {p.priceFrom.toFixed(2).replace('.', ',')}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p.weightTierUsed}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('Prices exclude customs, duties, fuel surcharge, island/peak. ±15–25% accuracy.')}
            </p>
          </section>
        )}

        {/* Customs forms */}
        {customs.needed && (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 sm:p-4">
            <SubHeading icon={FileText}>{t('Customs forms required')}</SubHeading>
            <p className="-mt-1.5 mb-2 text-xs text-muted-foreground">{customs.reason}</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {customs.forms.map((f) => (
                <span key={f} className={pillBase}>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  {f}
                </span>
              ))}
            </div>
            {customs.hints.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs leading-snug text-muted-foreground">
                {customs.hints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Incoterms recommendation */}
        {incoterms.length > 0 && (
          <section>
            <SubHeading icon={Flag}>{t('Recommended Incoterms')}</SubHeading>
            <div className="divide-y rounded-lg border">
              {incoterms.map((inc) => (
                <div key={inc.code} className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border px-1.5 py-0.5 text-xs font-medium text-foreground">
                      {inc.code}
                    </span>
                    <span className="text-sm text-foreground">{inc.labelDe}</span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{inc.typicalUse}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transit time */}
        {transits.length > 0 && (
          <section>
            <SubHeading icon={Clock}>{t('Transit time estimate')}</SubHeading>
            <div className="grid grid-cols-2 gap-2">
              {transits.map((t2) => (
                <div key={t2.carrier} className="rounded-lg border p-3">
                  <div className="truncate text-xs text-muted-foreground">{t2.carrier}</div>
                  <div className="text-sm font-medium tabular-nums text-foreground">{t2.days} {t('days')}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Surcharges */}
        {surcharges.length > 0 && (
          <section>
            <SubHeading icon={Percent}>{t('Applicable surcharges')}</SubHeading>
            <ul className="divide-y rounded-lg border">
              {surcharges.map(({ rule }) => (
                <li key={rule.id} className="flex flex-wrap items-start gap-x-2 gap-y-1 px-3 py-2.5 sm:flex-nowrap">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-foreground">{rule.labelDe}</div>
                    <div className="truncate text-xs text-muted-foreground">{rule.note}</div>
                  </div>
                  <div className="basis-full pl-[22px] text-xs tabular-nums text-muted-foreground sm:basis-auto sm:shrink-0 sm:pl-0 sm:text-right">
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
          <section className="rounded-lg border bg-muted/30 p-3 sm:p-4">
            <SubHeading icon={Shield}>{t('EU PPWR upcoming')}</SubHeading>
            <ul className="-mt-1.5 space-y-1">
              {ppwr.slice(0, 2).map((d) => (
                <li key={d.date} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 font-medium tabular-nums text-foreground">{d.date}</span>
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
