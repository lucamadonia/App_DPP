import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { gridStagger, gridItem, useReducedMotion } from '@/lib/motion';
import { Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { cn } from '@/lib/utils';
import type { Country } from '@/types/database';

interface CountrySelectGridProps {
  countries: Country[];
  curatedCountryCodes: string[];
  selectedCode: string | null;
  onSelect: (country: Country) => void;
  loading: boolean;
}

export function CountrySelectGrid({
  countries,
  curatedCountryCodes,
  selectedCode,
  onSelect,
  loading,
}: CountrySelectGridProps) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const [search, setSearch] = useState('');

  const curatedSet = useMemo(() => new Set(curatedCountryCodes), [curatedCountryCodes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? countries.filter(
          (c) =>
            c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term)
        )
      : countries;
    // Curated countries first, then alphabetical
    return [...list].sort((a, b) => {
      const aCur = curatedSet.has(a.code) ? 0 : 1;
      const bCur = curatedSet.has(b.code) ? 0 : 1;
      return aCur - bCur || a.name.localeCompare(b.name);
    });
  }, [countries, search, curatedSet]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const GridWrapper = prefersReduced ? 'div' : motion.div;
  const gridProps = prefersReduced
    ? {}
    : { variants: gridStagger, initial: 'initial', animate: 'animate' };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search countries...')}
          className="pl-9 h-11"
        />
      </div>

      <GridWrapper
        {...gridProps}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        {filtered.map((country) => {
          const isCurated = curatedSet.has(country.code);
          const isSelected = selectedCode === country.code;
          const ItemWrapper = prefersReduced ? 'div' : motion.div;
          const itemProps = prefersReduced
            ? {}
            : {
                variants: gridItem,
                whileHover: { y: -3, scale: 1.015 },
                whileTap: { scale: 0.985 },
              };

          return (
            <ItemWrapper key={country.code} {...itemProps}>
              <button
                type="button"
                onClick={() => onSelect(country)}
                aria-pressed={isSelected}
                className={cn(
                  'w-full min-h-[64px] flex items-center gap-3 rounded-xl border bg-card p-3 text-left',
                  'transition-colors duration-200 hover:border-primary/50 hover:shadow-md',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 shadow-md'
                    : 'border-border'
                )}
              >
                <span className="text-3xl leading-none shrink-0" aria-hidden="true">
                  {country.flag}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-sm">{country.name}</span>
                  {isCurated ? (
                    <Badge className="mt-1 h-5 gap-1 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100">
                      <ShieldCheck className="h-3 w-3" />
                      {t('Verified Data')}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="mt-1 h-5 gap-1 px-1.5 text-[10px] text-muted-foreground"
                    >
                      <Sparkles className="h-3 w-3" />
                      {t('AI-supported')}
                    </Badge>
                  )}
                </span>
              </button>
            </ItemWrapper>
          );
        })}
      </GridWrapper>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('No countries match your search.')}
        </p>
      )}
    </div>
  );
}
