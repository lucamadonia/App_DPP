import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarClock, Newspaper, Search, X, Flame } from 'lucide-react';
import { staggerContainer, useReducedMotion } from '@/lib/motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState, ErrorState } from '@/components/ui/state-feedback';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { getNews } from '@/services/supabase';
import type { NewsItem } from '@/types/database';
import { PageContainer } from '@/components/layout/page-container';
import { KnowledgeHero, HeroStat, HeroStats } from '@/components/knowledge/KnowledgeHero';
import { Chip, ChipRail } from '@/components/knowledge/ChipRail';
import { getDaysUntil } from '@/components/knowledge/deadline-utils';
import { NewsCard } from '@/components/news/NewsCard';
import { NewsDeadlineRail } from '@/components/news/NewsDeadlineRail';
import { NEWS_CATEGORIES, NEWS_CATEGORY_META } from '@/components/news/news-meta';

export function NewsPage() {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? ('div' as const) : motion.div;
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadNews = useCallback(() => {
    return getNews()
      .then(data => {
        setNews(data);
        setLoadError(false);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load news:', error);
        setLoadError(true);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const handleRetry = () => {
    setIsLoading(true);
    setLoadError(false);
    loadNews();
  };

  const query = searchQuery.toLowerCase();
  const filteredNews = news.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query);
    return matchesCategory && matchesPriority && matchesSearch;
  });

  const { upcomingDeadlines, highCount, next90, nextDays, categoryCounts } = useMemo(() => {
    const now = new Date();
    const upcoming = news
      .filter(item => item.effectiveDate && new Date(item.effectiveDate) > now)
      .sort((a, b) => new Date(a.effectiveDate!).getTime() - new Date(b.effectiveDate!).getTime());
    const counts: Record<string, number> = { all: news.length };
    for (const item of news) counts[item.category] = (counts[item.category] ?? 0) + 1;
    return {
      upcomingDeadlines: upcoming.slice(0, 6),
      highCount: news.filter(n => n.priority === 'high').length,
      next90: upcoming.filter(n => getDaysUntil(n.effectiveDate!) <= 90).length,
      nextDays: upcoming[0] ? getDaysUntil(upcoming[0].effectiveDate!) : null,
      categoryCounts: counts,
    };
  }, [news]);

  const filtersActive = categoryFilter !== 'all' || priorityFilter !== 'all' || searchQuery !== '';
  const resetFilters = () => {
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
  };

  return (
    <PageContainer size="full" padding={false} onRefresh={loadNews}>
      <div className="space-y-5 sm:space-y-6">
        <KnowledgeHero
          icon={Newspaper}
          eyebrow={t('Compliance & Knowledge')}
          title={t('Regulatory News')}
          description={t('Latest updates on EU regulations, standards, and deadlines')}
        >
          {isLoading ? (
            <HeroStats>
              {Array.from({ length: 4 }, (_, i) => (
                <ShimmerSkeleton key={i} className="h-[62px] rounded-xl" />
              ))}
            </HeroStats>
          ) : !loadError && news.length > 0 ? (
            <HeroStats>
              <HeroStat icon={Newspaper} label={t('News items')} value={<AnimatedCounter value={news.length} />} />
              <HeroStat
                icon={Flame}
                tone="danger"
                label={t('High priority')}
                value={<AnimatedCounter value={highCount} />}
              />
              <HeroStat
                icon={CalendarClock}
                tone="warning"
                label={t('Deadlines in 90 days')}
                value={<AnimatedCounter value={next90} />}
              />
              <HeroStat
                icon={AlertTriangle}
                tone="primary"
                label={t('Next deadline')}
                value={
                  nextDays === null
                    ? '—'
                    : nextDays === 1
                      ? t('in 1 day')
                      : t('in {{days}} days', { days: nextDays })
                }
              />
            </HeroStats>
          ) : null}
        </KnowledgeHero>

        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 3 }, (_, i) => (
                <ShimmerSkeleton key={i} className="h-24 w-60 shrink-0 rounded-2xl" />
              ))}
            </div>
            <ShimmerSkeleton className="h-11 rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <ShimmerSkeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border bg-card">
            <ErrorState
              title={t('Failed to load news')}
              message={t('Please check your connection and try again')}
              onRetry={handleRetry}
            />
          </div>
        ) : (
          <>
            <NewsDeadlineRail items={upcomingDeadlines} />

            {/* Filters */}
            <div className="space-y-3">
              <div className="flex flex-col gap-2 xs:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('Search news...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-9 pr-10 sm:h-10"
                    aria-label={t('Search news...')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                      aria-label={t('Clear search')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-11 w-full xs:w-[170px] sm:h-10" aria-label={t('Priority')}>
                    <SelectValue placeholder={t('Priority')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Priorities')}</SelectItem>
                    <SelectItem value="high">{t('High')}</SelectItem>
                    <SelectItem value="medium">{t('Medium')}</SelectItem>
                    <SelectItem value="low">{t('Low')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ChipRail label={t('Category')}>
                {NEWS_CATEGORIES.map(cat => {
                  const meta = cat.value === 'all' ? null : NEWS_CATEGORY_META[cat.value];
                  const Icon = meta?.icon;
                  const count = categoryCounts[cat.value] ?? 0;
                  return (
                    <Chip
                      key={cat.value}
                      selected={categoryFilter === cat.value}
                      onClick={() => setCategoryFilter(cat.value)}
                      icon={Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : undefined}
                      trailing={
                        <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] tabular-nums">
                          {count}
                        </span>
                      }
                    >
                      {t(cat.label)}
                    </Chip>
                  );
                })}
              </ChipRail>
            </div>

            {/* News cards */}
            {filteredNews.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card">
                <EmptyState
                  icon={Newspaper}
                  illustration={false}
                  title={t('No news found')}
                  description={t('Try adjusting your filters')}
                  actionLabel={filtersActive ? t('Reset filters') : undefined}
                  onAction={filtersActive ? resetFilters : undefined}
                />
              </div>
            ) : (
              <MotionDiv
                key={`${categoryFilter}-${priorityFilter}`}
                className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
                {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
              >
                {filteredNews.map(item => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </MotionDiv>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {t('Showing {{count}} of {{total}} news items', {
                count: filteredNews.length,
                total: news.length,
              })}
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}
