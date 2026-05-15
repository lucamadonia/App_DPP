import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BadgeCheck, Sparkles } from 'lucide-react';
import { StarRating } from '@/components/feedback/StarRating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getPublicReviewsForTenant,
  getFeedbackPhotoPublicUrl,
} from '@/services/supabase/feedback-public';
import { getFeedbackSettingsByTenantSlug } from '@/services/supabase/feedback-settings';
import { getVariantColorHex } from '@/lib/variant-color';
import { sendReadyEvent, initEmbedResizeObserver } from '@/lib/embed-messaging';
import type { PublicFeedbackReviewItem, FeedbackWidgetMode } from '@/types/feedback';
import { cn } from '@/lib/utils';

/**
 * Embeddable feedback widget for the tenant's homepage. Loaded inside an
 * iframe; sends resize events to the parent via embed-messaging.
 *
 * Query params:
 *   ?mode=carousel|grid|badge    (default from tenant settings)
 *   ?product=<uuid>              (optional product filter)
 *   ?minRating=<1-5>             (default 1)
 *   ?limit=<n>                   (default 12)
 *   ?accent=<#hex>               (override card accent)
 *
 * Outputs a Schema.org AggregateRating + Review JSON-LD block in the
 * document head so Google can show the star snippet in search results.
 */
export function EmbedFeedbackPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [params] = useSearchParams();

  const mode = (params.get('mode') as FeedbackWidgetMode) || 'carousel';
  const productId = params.get('product') || undefined;
  const minRating = Number(params.get('minRating') || 1);
  const limit = Number(params.get('limit') || 12);
  const accentParam = params.get('accent') || undefined;

  const [reviews, setReviews] = useState<PublicFeedbackReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [accent, setAccent] = useState(accentParam || '#F59E0B');
  const [tenantName, setTenantName] = useState('');

  // Resize observer → tell parent iframe to adjust height
  useEffect(() => {
    sendReadyEvent();
    const cleanup = initEmbedResizeObserver();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!tenantSlug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [list, settings] = await Promise.all([
        getPublicReviewsForTenant({ tenantSlug, productId, minRating, limit }),
        getFeedbackSettingsByTenantSlug(tenantSlug),
      ]);
      if (cancelled) return;
      // Hydrate photo URLs (the bucket is public — we get URLs deterministically)
      const hydrated = list.map(r => ({
        ...r,
        photos: r.photos.map(p => ({ ...p, url: getFeedbackPhotoPublicUrl(p.path) })),
      }));
      setReviews(hydrated);
      if (!accentParam && settings?.widget.accentColor) setAccent(settings.widget.accentColor);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tenantSlug, productId, minRating, limit, accentParam]);

  // Inject Schema.org JSON-LD into document head for SEO. This is the
  // single most valuable feature for tenants — Google can show ★★★★★ next
  // to their homepage in search results.
  useEffect(() => {
    if (reviews.length === 0) return;
    const totalCount = reviews[0]?.total_count || reviews.length;
    const avg = reviews[0]?.aggregate_rating || averageRating(reviews);
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: tenantName || tenantSlug,
      aggregateRating: avg
        ? {
            '@type': 'AggregateRating',
            ratingValue: avg.toFixed(2),
            reviewCount: String(totalCount),
            bestRating: '5',
          }
        : undefined,
      review: reviews.slice(0, 10).map(r => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.reviewer_display_name },
        datePublished: r.created_at,
        reviewBody: r.comment || r.title || '',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: String(r.rating),
          bestRating: '5',
        },
      })),
    };
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.text = JSON.stringify(ld);
    document.head.appendChild(tag);
    return () => {
      document.head.removeChild(tag);
    };
  }, [reviews, tenantSlug, tenantName]);

  // Pull tenant name lazily (cosmetic only)
  useEffect(() => {
    if (!tenantSlug) return;
    import('@/lib/supabase').then(({ supabase }) =>
      supabase
        .from('tenants')
        .select('name')
        .eq('slug', tenantSlug)
        .single()
        .then(({ data }) => {
          if (data?.name) setTenantName(data.name);
        }),
    );
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="p-4 grid gap-3 sm:grid-cols-3">
        <ShimmerSkeleton className="h-44" />
        <ShimmerSkeleton className="h-44 hidden sm:block" />
        <ShimmerSkeleton className="h-44 hidden sm:block" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Noch keine Bewertungen vorhanden.
      </div>
    );
  }

  const avg = reviews[0]?.aggregate_rating || averageRating(reviews);
  const totalCount = reviews[0]?.total_count || reviews.length;

  if (mode === 'badge') {
    return (
      <div className="inline-flex items-center gap-2 p-3 rounded-lg border bg-card shadow-sm">
        <StarRating value={avg || 0} size="md" color={accent} />
        <div className="text-sm">
          <span className="font-semibold">{avg ? avg.toFixed(1) : '—'}</span>
          <span className="text-muted-foreground"> / 5</span>
        </div>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">
          {totalCount} verifizierte Bewertung{totalCount === 1 ? '' : 'en'}
        </span>
      </div>
    );
  }

  if (mode === 'grid') {
    return (
      <div className="p-4 space-y-4">
        <Header avg={avg} totalCount={totalCount} accent={accent} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map(r => (
            <EmbedReviewCard key={r.id} review={r} accent={accent} variant="grid" />
          ))}
        </div>
      </div>
    );
  }

  // Default: carousel
  return (
    <div className="p-4 space-y-4">
      <Header avg={avg} totalCount={totalCount} accent={accent} />
      <Carousel reviews={reviews} accent={accent} />
    </div>
  );
}

function Header({ avg, totalCount, accent }: { avg: number | null; totalCount: number; accent: string }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <StarRating value={avg || 0} size="md" color={accent} />
        <div>
          <div className="text-lg font-bold tabular-nums">
            {avg ? avg.toFixed(1) : '—'}
            <span className="text-sm font-normal text-muted-foreground"> / 5</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {totalCount} verifizierte Bewertung{totalCount === 1 ? '' : 'en'}
          </div>
        </div>
      </div>
      <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200">
        <BadgeCheck className="h-3 w-3" />
        Verifizierte Kunden
      </Badge>
    </div>
  );
}

function Carousel({ reviews, accent }: { reviews: PublicFeedbackReviewItem[]; accent: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    if (!ref.current) return;
    const w = ref.current.clientWidth;
    ref.current.scrollBy({ left: dir * (w * 0.8), behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-thin pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {reviews.map(r => (
          <div key={r.id} className="snap-start shrink-0 w-[85%] sm:w-[50%] lg:w-[33%]">
            <EmbedReviewCard review={r} accent={accent} variant="carousel" />
          </div>
        ))}
      </div>
      {reviews.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute -left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow-md hidden sm:flex"
            onClick={() => scroll(-1)}
            aria-label="Vorherige"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute -right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow-md hidden sm:flex"
            onClick={() => scroll(1)}
            aria-label="Nächste"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
}

function EmbedReviewCard({
  review,
  accent,
  variant,
}: {
  review: PublicFeedbackReviewItem;
  accent: string;
  variant: 'carousel' | 'grid';
}) {
  const variantHex = review.variant_title ? getVariantColorHex(review.variant_title) : null;
  return (
    <Card className={cn('h-full overflow-hidden', variant === 'carousel' && 'min-h-[200px]')}>
      <CardContent className="p-4 space-y-2.5 h-full flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <StarRating value={review.rating} size="sm" color={accent} />
          <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200">
            <BadgeCheck className="h-3 w-3" />
            Verifiziert
          </Badge>
        </div>
        {(review.product_name || review.variant_title) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium">{review.product_name}</span>
            {review.variant_title && (
              <Badge
                variant="outline"
                className="gap-1 px-1.5 py-0 text-[10px] font-semibold border-2 bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-900/30 dark:text-violet-100 dark:border-violet-700"
              >
                {variantHex && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full border border-black/20"
                    style={{ backgroundColor: variantHex }}
                  />
                )}
                {review.variant_title}
              </Badge>
            )}
          </div>
        )}
        {review.title && <div className="font-semibold text-sm leading-tight">{review.title}</div>}
        {review.comment && (
          <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-5 break-words">
            {review.comment}
          </p>
        )}
        {review.photos && review.photos.length > 0 && (
          <div className="flex gap-2">
            {review.photos.slice(0, 3).map((p, i) => (
              <div key={i} className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                <img src={p.path} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
        <div className="text-xs text-muted-foreground pt-1 mt-auto flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-foreground/80">{review.reviewer_display_name}</span>
          {review.reviewer_city && <span>· {review.reviewer_city}</span>}
        </div>
        {review.reply && (
          <div className="rounded-md bg-muted/50 p-2 border-l-2 text-xs" style={{ borderColor: accent }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="h-3 w-3" style={{ color: accent }} />
              <span className="font-semibold">{review.reply.author}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed line-clamp-3">{review.reply.content}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function averageRating(reviews: PublicFeedbackReviewItem[]): number | null {
  if (reviews.length === 0) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}
