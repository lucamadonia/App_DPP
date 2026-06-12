/**
 * Shipping Rates — package input card.
 *
 * Live-reactive (no submit button): dimensions, weight stepper, goods value
 * and origin/destination country comboboxes with flags + zone badges.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Minus, Package, Plus } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { COUNTRY_ZONES } from '@/lib/smart-packing';
import type { ZoneKind } from '@/lib/smart-packing-data';
import { flagEmoji } from './shipping-rate-utils';

export interface RateFormState {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  valueEur: number;
  origin: string;
  destination: string;
}

// ---------------------------------------------------------------------------
// Zone badge
// ---------------------------------------------------------------------------
const ZONE_BADGE: Record<ZoneKind, { labelKey: string; className: string }> = {
  eu: {
    labelKey: 'EU',
    className:
      'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400',
  },
  eea_non_eu: {
    labelKey: 'EEA',
    className:
      'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-900/20 dark:text-sky-400',
  },
  third_country: {
    labelKey: 'Third country',
    className:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400',
  },
  special_zone: {
    labelKey: 'Special zone',
    className:
      'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-900/20 dark:text-purple-400',
  },
};

export function ZoneBadge({ zone, className }: { zone: ZoneKind; className?: string }) {
  const { t } = useTranslation('warehouse');
  const cfg = ZONE_BADGE[zone];
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium', cfg.className, className)}>
      {t(cfg.labelKey)}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Country combobox (flag + localized name + zone badge, searchable)
// ---------------------------------------------------------------------------
function CountryCombobox({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (iso2: string) => void;
  label: string;
  placeholder: string;
}) {
  const { t, i18n } = useTranslation('warehouse');
  const [open, setOpen] = useState(false);
  const isDe = i18n.language?.startsWith('de');

  const countries = useMemo(() => {
    const list = Object.values(COUNTRY_ZONES).map((c) => ({
      ...c,
      label: isDe ? c.nameDe : c.nameEn,
    }));
    list.sort((a, b) => a.label.localeCompare(b.label, isDe ? 'de' : 'en'));
    return list;
  }, [isDe]);

  const selected = value ? COUNTRY_ZONES[value] : null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full min-h-[44px] justify-between font-normal"
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <span aria-hidden="true">{flagEmoji(selected.iso2)}</span>
                <span className="truncate">{isDe ? selected.nameDe : selected.nameEn}</span>
                <ZoneBadge zone={selected.zone} />
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('Search country…')} />
            <CommandList>
              <CommandEmpty>{t('No country found')}</CommandEmpty>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country.iso2}
                    value={`${country.label} ${country.iso2}`}
                    onSelect={() => {
                      onChange(country.iso2);
                      setOpen(false);
                    }}
                    className="min-h-[44px] gap-2"
                  >
                    <span aria-hidden="true">{flagEmoji(country.iso2)}</span>
                    <span className="flex-1 truncate">{country.label}</span>
                    <ZoneBadge zone={country.zone} />
                    <Check
                      className={cn(
                        'h-4 w-4',
                        value === country.iso2 ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Numeric field helpers
// ---------------------------------------------------------------------------
function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value || ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(',', '.'));
            onChange(Number.isFinite(v) && v >= 0 ? v : 0);
          }}
          className="min-h-[44px] tabular-nums pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function WeightStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const stepBy = (dir: 1 | -1) => {
    const next = Math.round((value + dir * 0.5) * 10) / 10;
    onChange(Math.max(0.1, next));
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center rounded-xl border focus-within:ring-2 focus-within:ring-primary/30 transition-all">
        <button
          type="button"
          aria-label="−0.5 kg"
          onClick={() => stepBy(-1)}
          disabled={value <= 0.1}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-l-xl transition-colors hover:bg-muted active:bg-muted/80 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <Input
          type="number"
          inputMode="decimal"
          min={0.1}
          step={0.1}
          value={value || ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value.replace(',', '.'));
            onChange(Number.isFinite(v) && v > 0 ? v : 0);
          }}
          className="h-11 border-0 text-center text-base font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="+0.5 kg"
          onClick={() => stepBy(1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-r-xl transition-colors hover:bg-muted active:bg-muted/80"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function ShippingRateInputCard({
  form,
  onChange,
}: {
  form: RateFormState;
  onChange: (patch: Partial<RateFormState>) => void;
}) {
  const { t } = useTranslation('warehouse');

  return (
    <GlassCard enableGlow className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-[18px] w-[18px] text-primary" />
        </div>
        <h2 className="font-semibold">{t('Package Details')}</h2>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-3 gap-2.5">
        <NumberField
          label={t('Length (cm)')}
          value={form.lengthCm}
          onChange={(v) => onChange({ lengthCm: v })}
          suffix="cm"
        />
        <NumberField
          label={t('Width (cm)')}
          value={form.widthCm}
          onChange={(v) => onChange({ widthCm: v })}
          suffix="cm"
        />
        <NumberField
          label={t('Height (cm)')}
          value={form.heightCm}
          onChange={(v) => onChange({ heightCm: v })}
          suffix="cm"
        />
      </div>

      {/* Weight + value */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <WeightStepper
          label={t('Weight (kg)')}
          value={form.weightKg}
          onChange={(v) => onChange({ weightKg: v })}
        />
        <NumberField
          label={t('Goods value (€)')}
          value={form.valueEur}
          onChange={(v) => onChange({ valueEur: v })}
          step={10}
          suffix="€"
        />
      </div>

      {/* Route */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <CountryCombobox
          value={form.origin}
          onChange={(iso2) => onChange({ origin: iso2 })}
          label={t('From country')}
          placeholder={t('Search country…')}
        />
        <CountryCombobox
          value={form.destination}
          onChange={(iso2) => onChange({ destination: iso2 })}
          label={t('To country')}
          placeholder={t('Search country…')}
        />
      </div>
    </GlassCard>
  );
}
