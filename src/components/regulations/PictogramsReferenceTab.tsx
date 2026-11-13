import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, FlaskConical, Images, MapPin, Recycle, Ruler, Search, Shield, Tag, Zap, type LucideIcon } from 'lucide-react';
import type { Pictogram, RecyclingCode } from '@/types/database';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { EmptyState } from '@/components/ui/state-feedback';
import { gridItem, gridStagger, useReducedMotion } from '@/lib/motion';
import { Chip } from './DeadlineChip';
import { FilterChips, SearchField } from './FilterChips';

const PICTO_CATEGORIES: Array<{ value: Pictogram['category']; label: string; icon: LucideIcon }> = [
  { value: 'safety', label: 'Safety', icon: Shield },
  { value: 'recycling', label: 'Recycling', icon: Recycle },
  { value: 'chemicals', label: 'Chemicals', icon: FlaskConical },
  { value: 'energy', label: 'Energy', icon: Zap },
  { value: 'durability', label: 'Durability', icon: Clock },
];

interface PictogramsReferenceTabProps {
  pictograms: Pictogram[];
  recyclingCodes: RecyclingCode[];
}

export function PictogramsReferenceTab({ pictograms, recyclingCodes }: PictogramsReferenceTabProps) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pictograms.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.countries.some((c) => c.toLowerCase().includes(q));
    });
  }, [pictograms, category, query]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of pictograms) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [pictograms]);

  const Grid = prefersReduced ? 'div' : motion.div;
  const Item = prefersReduced ? 'article' : motion.article;
  const gridProps = !prefersReduced ? { variants: gridStagger, initial: 'initial', animate: 'animate' } : {};
  const itemProps = !prefersReduced ? { variants: gridItem } : {};

  return (
    <div className="min-w-0 space-y-8">
      <section className="space-y-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">{t('Pictograms & Symbols')}</h2>
            <p className="text-sm text-muted-foreground">{t('Important markings for your products with detailed requirements')}</p>
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t('Search pictograms...')}
            clearLabel={t('Clear search')}
            className="w-full sm:w-72 sm:shrink-0"
          />
        </div>

        <FilterChips
          ariaLabel={t('Filter by category')}
          value={category}
          onChange={(v) => setCategory(v === category ? 'all' : v)}
          options={[
            { value: 'all', label: t('All'), count: pictograms.length },
            ...PICTO_CATEGORIES.filter((c) => counts[c.value]).map((c) => ({
              value: c.value,
              label: t(c.label),
              icon: c.icon,
              count: counts[c.value],
            })),
          ]}
        />

        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={pictograms.length === 0 ? t('No pictograms available yet') : t('No pictograms match your filters')}
            actionLabel={category !== 'all' || query ? t('Reset filters') : undefined}
            onAction={() => {
              setCategory('all');
              setQuery('');
            }}
          />
        ) : (
          <Grid className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-3" {...gridProps}>
            {filtered.map((p) => (
              <Item key={p.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm" {...itemProps}>
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-foreground ring-1 ring-border"
                  >
                    {p.symbol}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-semibold leading-snug break-words">{p.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip tone={p.mandatory ? 'danger' : 'muted'}>{p.mandatory ? t('Mandatory') : t('Voluntary')}</Chip>
                      {p.countries.slice(0, 4).map((c) => (
                        <Chip key={c} tone="primary">{c}</Chip>
                      ))}
                      {p.countries.length > 4 && <Chip>+{p.countries.length - 4}</Chip>}
                    </div>
                  </div>
                </div>
                {p.description && <p className="text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
                <dl className="mt-auto grid gap-2 rounded-xl bg-muted/50 p-3 text-xs">
                  {p.dimensions && (
                    <div className="flex min-w-0 items-start gap-2">
                      <dt className="flex shrink-0 items-center gap-1 font-medium text-muted-foreground">
                        <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('Dimensions')}:
                      </dt>
                      <dd className="min-w-0 break-words">{p.dimensions}</dd>
                    </div>
                  )}
                  {p.placement && (
                    <div className="flex min-w-0 items-start gap-2">
                      <dt className="flex shrink-0 items-center gap-1 font-medium text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('Placement')}:
                      </dt>
                      <dd className="min-w-0 break-words">{p.placement}</dd>
                    </div>
                  )}
                </dl>
              </Item>
            ))}
          </Grid>
        )}
      </section>

      {/* Bridge to the tenant's own uploaded label artwork. */}
      <section className="relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <IconTile icon={Images} size="lg" />
          <div className="min-w-0">
            <p className="font-semibold">{t('Your own pictogram library')}</p>
            <p className="text-sm text-muted-foreground">{t('Upload the exact label artwork you print, and reuse it across products.')}</p>
          </div>
        </div>
        <Button asChild className="min-h-11 w-full sm:w-auto sm:min-h-9">
          <Link to="/pictograms">
            {t('Open library')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <IconTile icon={Tag} size="md" tone="success" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">{t('Recycling Codes per ISO 1043 & 14021')}</h2>
            <p className="text-sm text-muted-foreground">{t('Material identification codes for packaging and products')}</p>
          </div>
        </div>
        {recyclingCodes.length === 0 ? (
          <EmptyState icon={Recycle} illustration={false} title={t('No recycling codes available yet')} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3">
            {recyclingCodes.map((code) => (
              <div key={code.code} className="flex min-w-0 items-start gap-3 rounded-xl border bg-card p-3.5">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-success/10 text-success ring-1 ring-inset ring-success/20">
                  <span aria-hidden="true" className="text-lg leading-none">{code.symbol}</span>
                  <span className="mt-0.5 font-mono text-[10px] font-semibold leading-none">{code.code}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <p className="font-semibold leading-tight">{code.name}</p>
                    <Chip tone={code.recyclable ? 'success' : 'muted'}>{code.recyclable ? t('Recyclable') : t('Limited')}</Chip>
                  </div>
                  <p className="text-xs text-muted-foreground break-words">{code.fullName}</p>
                  {code.examples && <p className="line-clamp-2 text-xs text-muted-foreground/90">{code.examples}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
