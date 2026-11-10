import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterChips, SearchField } from '@/components/regulations/FilterChips';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from './pictogram-config';
import { useCategoryLabel } from './use-category-label';

interface PictogramsToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  year: string;
  onYear: (v: string) => void;
  years: string[];
  category: string;
  onCategory: (v: string) => void;
  categoryCounts: Record<string, number>;
  total: number;
  shown: number;
  view: 'grid' | 'list';
  onView: (v: 'grid' | 'list') => void;
  onReset: () => void;
}

export function PictogramsToolbar(props: PictogramsToolbarProps) {
  const { t } = useTranslation('products');
  const categoryLabel = useCategoryLabel();
  const categories = Object.keys(props.categoryCounts).sort();
  const hasFilters = props.search !== '' || props.year !== 'all' || props.category !== 'all';

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          value={props.search}
          onChange={props.onSearch}
          placeholder={t('pictograms.search', 'Search pictograms...')}
          clearLabel={t('Clear search')}
          className="w-full sm:max-w-sm sm:flex-1"
        />
        <div className="flex min-w-0 items-center gap-2">
          {props.years.length > 0 && (
            <Select value={props.year} onValueChange={props.onYear}>
              <SelectTrigger
                className="min-h-11 min-w-0 flex-1 sm:min-h-9 sm:w-[180px] sm:flex-none"
                aria-label={t('pictograms.regulationYear', 'Regulation Year')}
              >
                <SelectValue placeholder={t('pictograms.regulationYear', 'Regulation Year')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('pictograms.allYears', 'All Years')}</SelectItem>
                {props.years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground" aria-live="polite">
              {props.shown} / {props.total}
            </span>
            <div role="radiogroup" aria-label={t('View')} className="hidden items-center rounded-lg border bg-card p-0.5 sm:flex">
              {(['grid', 'list'] as const).map((mode) => {
                const Icon = mode === 'grid' ? LayoutGrid : List;
                return (
                  <Button
                    key={mode}
                    role="radio"
                    aria-checked={props.view === mode}
                    aria-label={mode === 'grid' ? t('Grid view') : t('List view')}
                    variant={props.view === mode ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => props.onView(mode)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <FilterChips
          className="min-w-0 flex-1"
          ariaLabel={t('pictograms.category', 'Category')}
          value={props.category}
          onChange={(v) => props.onCategory(v === props.category ? 'all' : v)}
          options={[
            { value: 'all', label: t('pictograms.allCategories', 'All Categories'), count: props.total },
            ...categories.map((c) => ({
              value: c,
              label: categoryLabel(c),
              icon: getCategoryConfig(c).icon,
              count: props.categoryCounts[c],
            })),
          ]}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onReset}
            className={cn('min-h-11 shrink-0 sm:min-h-9')}
            aria-label={t('Reset filters')}
          >
            <X className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{t('Reset filters')}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
