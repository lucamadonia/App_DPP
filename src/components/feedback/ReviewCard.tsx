import { Star, BadgeCheck, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from './StarRating';
import { getVariantColorHex } from '@/lib/variant-color';
import { cn } from '@/lib/utils';

export interface ReviewCardData {
  id: string;
  productName?: string;
  variantTitle?: string;
  rating: number;
  title?: string;
  comment?: string;
  reviewerDisplayName: string;
  reviewerCity?: string;
  createdAt: string;
  photos?: { path: string; url?: string }[];
  reply?: { author: string; content: string };
}

interface Props {
  review: ReviewCardData;
  variant?: 'compact' | 'standard' | 'featured';
  className?: string;
  accentColor?: string;
}

/**
 * Reusable review card used in admin lists AND the public embed widget.
 * The DPP-USP is rendered prominently: variant title with color swatch
 * + "Verified" badge to communicate authenticity at a glance.
 */
export function ReviewCard({ review, variant = 'standard', className, accentColor }: Props) {
  const variantHex = review.variantTitle ? getVariantColorHex(review.variantTitle) : null;
  const showQuote = variant === 'featured' && (review.comment?.length ?? 0) > 40;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow hover:shadow-md',
        variant === 'featured' && 'shadow-md',
        className,
      )}
    >
      <CardContent className={cn('space-y-3', variant === 'compact' ? 'p-3' : 'p-4 sm:p-5')}>
        {/* Header: stars + product/variant + verified */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <StarRating
              value={review.rating}
              size={variant === 'featured' ? 'md' : 'sm'}
              color={accentColor}
            />
            {(review.productName || review.variantTitle) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {review.productName && (
                  <span className="font-medium text-foreground">{review.productName}</span>
                )}
                {review.variantTitle && (
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
                    {review.variantTitle}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Badge
            variant="outline"
            className="shrink-0 gap-1 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700"
          >
            <BadgeCheck className="h-3 w-3" />
            Verifiziert
          </Badge>
        </div>

        {/* Title + comment */}
        {(review.title || review.comment) && (
          <div className="space-y-1">
            {review.title && (
              <h3 className="text-sm sm:text-base font-semibold leading-tight">{review.title}</h3>
            )}
            {review.comment && (
              <div className="relative text-sm leading-relaxed text-muted-foreground">
                {showQuote && (
                  <Quote className="absolute -left-1 -top-1 h-4 w-4 text-foreground/10" aria-hidden="true" />
                )}
                <p className={cn(showQuote && 'pl-4')}>{review.comment}</p>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {review.photos && review.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {review.photos.slice(0, 4).map((p, idx) => (
              <div
                key={idx}
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-md overflow-hidden bg-muted shrink-0"
              >
                <img
                  src={p.url || p.path}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Footer: reviewer + date */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span className="font-medium text-foreground/80">{review.reviewerDisplayName}</span>
          {review.reviewerCity && <span>·</span>}
          {review.reviewerCity && <span>{review.reviewerCity}</span>}
          <span className="ml-auto">{formatRelativeDate(review.createdAt)}</span>
        </div>

        {/* Reply */}
        {review.reply && (
          <div className="rounded-md bg-muted/50 p-3 border-l-2 border-primary text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <Star className="h-3 w-3 fill-current text-primary" />
              <span className="font-semibold">{review.reply.author}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{review.reply.content}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'heute';
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`;
  if (diffDays < 365) return `vor ${Math.floor(diffDays / 30)} Monaten`;
  return d.toLocaleDateString();
}
