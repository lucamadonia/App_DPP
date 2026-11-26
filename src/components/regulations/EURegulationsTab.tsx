import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, FileText, FlaskConical, Globe, Leaf, Recycle, Search, Shield, Tag, Zap, type LucideIcon } from 'lucide-react';
import type { EURegulation } from '@/types/database';
import { Accordion } from '@/components/ui/accordion';
import { EmptyState } from '@/components/ui/state-feedback';
import { EURegulationCard } from './EURegulationCard';
import { DppTimeline } from './DppTimeline';
import { FilterChips, SearchField } from './FilterChips';
import { daysUntil, parseDeadline } from './regulation-dates';
import type { Milestone } from './regulation-milestones';

const EU_CATEGORY_ICONS: Record<string, LucideIcon> = {
  environment: Leaf,
  safety: Shield,
  chemicals: FlaskConical,
  labeling: Tag,
  recycling: Recycle,
  energy: Zap,
  durability: Clock,
  sustainability: Leaf,
  digital: Globe,
  trade: FileText,
};

const CATEGORY_ORDER = ['environment', 'chemicals', 'recycling', 'safety', 'energy', 'sustainability', 'digital', 'trade', 'labeling'];

type StatusFilter = 'all' | 'active' | 'upcoming';

/** "active" when the application date has passed; falls back to the stored status. */
function isInForce(reg: EURegulation): boolean {
  const parsed = parseDeadline(reg.applicationDate);
  if (parsed.date) return daysUntil(parsed.date) <= 0;
  return reg.status === 'active';
}

interface EURegulationsTabProps {
  regulations: EURegulation[];
  milestones: Milestone[];
}

export function EURegulationsTab({ regulations, milestones }: EURegulationsTabProps) {
  const { t } = useTranslation('compliance');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const categoryLabel = (cat: string) => t(cat.charAt(0).toUpperCase() + cat.slice(1));

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of regulations) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const present = CATEGORY_ORDER.filter((c) => counts.has(c)).concat(
      Array.from(counts.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
    );
    return present.map((c) => ({ value: c, count: counts.get(c) ?? 0 }));
  }, [regulations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return regulations.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      if (status !== 'all' && (status === 'active') !== isInForce(r)) return false;
      if (!q) return true;
      return [r.name, r.fullName, r.description, r.officialReference ?? '', ...r.affectedProducts]
        .some((s) => s?.toLowerCase().includes(q));
    });
  }, [regulations, category, status, query]);

  const activeCount = regulations.filter(isInForce).length;
  const hasFilters = category !== 'all' || status !== 'all' || query !== '';

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold sm:text-lg">{t('EU-wide Regulations')}</h2>
            <p className="text-sm text-muted-foreground">{t('Valid in all EU member states - Click on a regulation for details')}</p>
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={t('Search regulations...')}
            clearLabel={t('Clear search')}
            className="w-full sm:w-72 sm:shrink-0"
          />
        </div>

        <FilterChips
          ariaLabel={t('Filter by status')}
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: 'all', label: t('All'), count: regulations.length },
            { value: 'active', label: t('In force'), count: activeCount },
            { value: 'upcoming', label: t('Upcoming'), count: regulations.length - activeCount },
          ]}
        />
        {categoryOptions.length > 1 && (
          <FilterChips
            ariaLabel={t('Filter by category')}
            value={category}
            onChange={(v) => setCategory(v === category ? 'all' : v)}
            options={[
              { value: 'all', label: t('All categories') },
              ...categoryOptions.map((c) => ({
                value: c.value,
                label: categoryLabel(c.value),
                icon: EU_CATEGORY_ICONS[c.value] ?? FileText,
                count: c.count,
              })),
            ]}
          />
        )}
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title={regulations.length === 0 ? t('No EU regulations available yet') : t('No regulations match your filters')}
              actionLabel={hasFilters ? t('Reset filters') : undefined}
              onAction={() => {
                setCategory('all');
                setStatus('all');
                setQuery('');
              }}
            />
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {filtered.map((reg) => (
                <EURegulationCard
                  key={reg.id}
                  regulation={reg}
                  icon={EU_CATEGORY_ICONS[reg.category] ?? FileText}
                  categoryLabel={categoryLabel(reg.category)}
                />
              ))}
            </Accordion>
          )}
        </div>
        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <DppTimeline milestones={milestones} />
        </div>
      </div>
    </div>
  );
}
