import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Eye, Clock, MessageCircleHeart, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StarRating } from '@/components/feedback/StarRating';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getReviews,
  approveReview,
  rejectReview,
  getReviewStats,
  type ReviewStats,
} from '@/services/supabase/feedback-reviews';
import type { FeedbackReview, FeedbackReviewStatus } from '@/types/feedback';
import { getVariantColorHex } from '@/lib/variant-color';
import { toast } from 'sonner';

export function FeedbackQueuePage() {
  const { t: _t } = useTranslation('warehouse');
  void _t;

  const [tab, setTab] = useState<FeedbackReviewStatus>('pending_review');
  const [reviews, setReviews] = useState<FeedbackReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [list, s] = await Promise.all([
      getReviews({ status: tab, limit: 50 }),
      getReviewStats(),
    ]);
    setReviews(list);
    setStats(s);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleApprove(id: string) {
    try {
      await approveReview(id);
      toast.success('Bewertung freigegeben');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectReview(id);
      toast.success('Bewertung abgelehnt');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircleHeart className="h-6 w-6" />
          Feedback
        </h1>
        <p className="text-sm text-muted-foreground">
          Verifizierte Kundenbewertungen prüfen und freigeben.
        </p>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Kpi icon={<Clock className="h-4 w-4" />} label="Offen" value={stats.pending} highlight={stats.pending > 0} />
          <Kpi icon={<Check className="h-4 w-4" />} label="Freigegeben" value={stats.approved} />
          <Kpi icon={<X className="h-4 w-4" />} label="Abgelehnt" value={stats.rejected} />
          <Kpi
            icon={<Sparkles className="h-4 w-4" />}
            label="Ø Sterne"
            value={stats.averageRating ? stats.averageRating.toFixed(2) : '—'}
          />
          <Kpi icon={<Eye className="h-4 w-4" />} label="Insgesamt" value={stats.total} />
        </div>
      )}

      <Tabs value={tab} onValueChange={v => setTab(v as FeedbackReviewStatus)}>
        <TabsList>
          <TabsTrigger value="pending_review" className="gap-1.5">
            Offen
            {stats && stats.pending > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Freigegeben</TabsTrigger>
          <TabsTrigger value="rejected">Abgelehnt</TabsTrigger>
          <TabsTrigger value="hidden">Versteckt</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            <>
              <ShimmerSkeleton className="h-32 w-full" />
              <ShimmerSkeleton className="h-32 w-full" />
              <ShimmerSkeleton className="h-32 w-full" />
            </>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Keine Bewertungen in diesem Status.
              </CardContent>
            </Card>
          ) : (
            reviews.map(r => (
              <ModerationRow
                key={r.id}
                review={r}
                onApprove={() => handleApprove(r.id)}
                onReject={() => handleReject(r.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10' : ''}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function ModerationRow({
  review,
  onApprove,
  onReject,
}: {
  review: FeedbackReview;
  onApprove: () => void;
  onReject: () => void;
}) {
  const variantHex = review.variantTitle ? getVariantColorHex(review.variantTitle) : null;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StarRating value={review.rating} size="sm" />
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-sm font-medium">{review.productName || review.productId.slice(0, 8)}</span>
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
            {review.title && <div className="font-semibold text-sm">{review.title}</div>}
            {review.comment && (
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {review.comment}
              </p>
            )}
            <div className="text-xs text-muted-foreground pt-1">
              {review.reviewerDisplayName}
              {review.reviewerCity ? ` · ${review.reviewerCity}` : ''}
              {' · '}
              {new Date(review.createdAt).toLocaleString()}
            </div>
            {review.aiSentiment && (
              <div className="flex items-center gap-1.5 pt-1">
                <Badge
                  variant="outline"
                  className={
                    review.aiSentiment === 'positive'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200'
                      : review.aiSentiment === 'negative'
                      ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200'
                      : 'bg-slate-50 text-slate-800 border-slate-300'
                  }
                >
                  AI: {review.aiSentiment}
                </Badge>
                {review.aiSuggestedTags?.map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {review.status === 'pending_review' && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button size="sm" onClick={onApprove} className="gap-1">
                <Check className="h-3.5 w-3.5" />
                Freigeben
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} className="gap-1">
                <X className="h-3.5 w-3.5" />
                Ablehnen
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
