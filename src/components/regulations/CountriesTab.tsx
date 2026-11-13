import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronRight, Globe, Search } from 'lucide-react';
import type { Country, NationalRegulation } from '@/types/database';
import { EmptyState } from '@/components/ui/state-feedback';
import { gridItem, gridStagger, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Chip } from './DeadlineChip';
import { SearchField } from './FilterChips';
import { CountryRegulationsPanel } from './CountryRegulationsPanel';

interface CountriesTabProps {
  countries: Country[];
  regulationsByCountry: Record<string, NationalRegulation[]>;
}

export function CountriesTab({ countries, regulationsByCountry }: CountriesTabProps) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.authorities.some((a) => a.toLowerCase().includes(q)),
    );
  }, [countries, query]);

  useEffect(() => {
    if (!selected) return;
    panelRef.current?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  }, [selected, prefersReduced]);

  const selectedCountry = countries.find((c) => c.code === selected) ?? null;

  if (countries.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title={t('No countries available yet')}
        description={t('Country data is loaded from the regulation knowledge base.')}
      />
    );
  }

  const Grid = prefersReduced ? 'div' : motion.div;
  const Item = prefersReduced ? 'div' : motion.div;

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold sm:text-lg">{t('Country-Specific Regulations')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('Select a country for detailed compliance requirements and national specifics')}
          </p>
        </div>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t('Search countries or authorities...')}
          clearLabel={t('Clear search')}
          className="w-full sm:w-72 sm:shrink-0"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('No countries match your search')}
          actionLabel={t('Clear search')}
          onAction={() => setQuery('')}
        />
      ) : (
        <Grid
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3"
          {...(!prefersReduced && { variants: gridStagger, initial: 'initial', animate: 'animate' })}
        >
          {filtered.map((country) => {
            const regs = regulationsByCountry[country.code] ?? [];
            const count = regs.length || country.regulations;
            const mandatory = regs.filter((r) => r.mandatory).length;
            const active = selected === country.code;
            return (
              <Item key={country.code} {...(!prefersReduced && { variants: gridItem })} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(active ? null : country.code)}
                  className={cn(
                    'group flex h-full w-full min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm',
                    'transition-[border-color,box-shadow,background-color,transform] duration-200 ease-out hover-lift',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    active ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/30' : 'hover:border-primary/40 hover:shadow-md',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl ring-1 ring-border"
                    >
                      {country.flag}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight break-words">{country.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{country.code}</p>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                        active ? 'rotate-90 text-primary' : 'group-hover:translate-x-0.5',
                      )}
                    />
                  </div>
                  {country.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{country.description}</p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Chip tone="primary">{t('{{count}} Regulations', { count })}</Chip>
                    {mandatory > 0 && <Chip tone="danger">{t('{{count}} mandatory', { count: mandatory })}</Chip>}
                    {country.authorities.slice(0, 2).map((a) => (
                      <Chip key={a} className="max-w-[10rem]">{a}</Chip>
                    ))}
                    {country.authorities.length > 2 && <Chip>+{country.authorities.length - 2}</Chip>}
                  </div>
                </button>
              </Item>
            );
          })}
        </Grid>
      )}

      {selectedCountry && (
        <div ref={panelRef} className="scroll-mt-24">
          <CountryRegulationsPanel
            key={selectedCountry.code}
            country={selectedCountry}
            regulations={regulationsByCountry[selectedCountry.code] ?? []}
            onClose={() => setSelected(null)}
          />
        </div>
      )}
    </div>
  );
}
