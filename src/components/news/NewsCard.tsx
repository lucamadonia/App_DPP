import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowUpRight, Globe, Newspaper } from 'lucide-react';
import { staggerItem, useReducedMotion } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';
import type { NewsItem } from '@/types/database';
import { DeadlineChip } from '@/components/knowledge/DeadlineChip';
import { PriorityBadge, PRIORITY_ACCENT } from '@/components/knowledge/PriorityBadge';
import { NEWS_CATEGORY_META, capitalize } from './news-meta';

export function NewsCard({ item }: { item: NewsItem }) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();
  const Wrapper = prefersReduced ? 'article' : motion.article;
  const motionProps = prefersReduced ? {} : { variants: staggerItem };
  const cat = NEWS_CATEGORY_META[item.category] ?? NEWS_CATEGORY_META.update;
  const CatIcon = cat.icon;

  return (
    <Wrapper
      {...motionProps}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm',
        'transition-[box-shadow,border-color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-reduce:hover:translate-y-0',
        // priority accent stripe
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        PRIORITY_ACCENT[item.priority]
      )}
    >
      {item.imageUrl && (
        <div className="aspect-[16/7] w-full overflow-hidden bg-muted">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5',
              cat.className
            )}
          >
            <CatIcon className="h-3 w-3" aria-hidden="true" />
            {t(capitalize(item.category))}
          </span>
          <PriorityBadge priority={item.priority} />
          <time
            dateTime={item.publishedAt}
            className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
          >
            {formatDate(item.publishedAt, locale)}
          </time>
        </div>

        <h3 className="text-base font-semibold leading-snug text-balance break-words sm:text-lg">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          {item.summary}
        </p>

        {item.effectiveDate && (
          <div className="mt-3">
            <DeadlineChip date={item.effectiveDate} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.countries.length > 0 && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-words">{item.countries.join(', ')}</span>
            </span>
          )}
          {item.source && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Newspaper className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-words">
                {t('Source')}: {item.source}
              </span>
            </span>
          )}
        </div>

        {item.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {item.tags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="secondary" className="h-auto whitespace-normal text-[11px] font-normal">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {item.link && (
          <div className="mt-auto pt-3">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
            >
              {t('Read more')}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
