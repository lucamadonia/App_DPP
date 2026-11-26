import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Eye, EyeOff, Clock, MessageCircleHeart, Sparkles, Reply } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StarRating } from '@/components/feedback/StarRating';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getReviews,
  approveReview,
  rejectReview,
  hideReview,
  addReply,
  getReviewStats,
  type ReviewStats,
} from '@/services/supabase/feedback-reviews';
import type { FeedbackReview, FeedbackReviewStatus } from '@/types/feedback';
import { getFeedbackPhotoPublicUrl } from '@/services/supabase/feedback-public';
import { getVariantColorHex } from '@/lib/variant-color';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { useBranding } from '@/contexts/BrandingContext';

const REPLY_AUTHOR_STORAGE_KEY = 'feedback.replyAuthor';
const REPLY_MAX_LENGTH = 2000;

function readStoredReplyAuthor(): string {
  try {
    return window.localStorage.getItem(REPLY_AUTHOR_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function FeedbackQueuePage() {
  const { t } = useTranslation('warehouse');

  const [tab, setTab] = useState<FeedbackReviewStatus>('pending_review');
  const [reviews, setReviews] = useState<FeedbackReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { branding } = useBranding();
  // Public author name of replies. Remembered per browser, defaults to the
  // tenant's app name.
  const [replyAuthor, setReplyAuthor] = useState<string>(readStoredReplyAuthor);
  const effectiveReplyAuthor = replyAuthor.trim() || branding.appName;

  function handleReplyAuthorChange(value: string) {
    setReplyAuthor(value);
    try {
      window.localStorage.setItem(REPLY_AUTHOR_STORAGE_KEY, value);
    } catch {
      // Storage unavailable (private mode): keep the value for this session.
    }
  }

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
      toast.success(t('Review approved'));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectReview(id);
      toast.success(t('Review rejected'));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleHide(id: string) {
    try {
      await hideReview(id);
      toast.success(t('Review hidden'));
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleReply(id: string, content: string): Promise<boolean> {
    try {
      await addReply(id, content, effectiveReplyAuthor);
      toast.success(t('Reply published'));
      reload();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  return (
    <PageContainer
      size="full"
      padding={false}
      onRefresh={reload}
      title={
        <span className="flex items-center gap-2">
          <MessageCircleHeart className="h-6 w-6" />
          Feedback
        </span>
      }
      description="Verifizierte Kundenbewertungen prüfen und freigeben."
    >
      <div className="space-y-4 sm:space-y-6">
      {/* KPIs */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Kpi icon={<Clock className="h-4 w-4" />} label="Offen" value={stats.pending} highlight={stats.pending > 0} />
          <Kpi icon={<Check className="h-4 w-4" />} label="Freigegeben" value={stats.approved} />
          <Kpi icon={<X className="h-4 w-4" />} label="Abgelehnt" value={stats.rejected} />
          <Kpi
            icon={<Sparkles className="h-4 w-4" />}
            label="Ø Sterne"
            value={stats.averageRating != null ? stats.averageRating.toFixed(2) : 'ohne Note'}
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
                onHide={() => handleHide(r.id)}
                onReply={content => handleReply(r.id, content)}
                replyAuthor={replyAuthor}
                replyAuthorPlaceholder={branding.appName}
                onReplyAuthorChange={handleReplyAuthorChange}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
      </div>
    </PageContainer>
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
  onHide,
  onReply,
  replyAuthor,
  replyAuthorPlaceholder,
  onReplyAuthorChange,
}: {
  review: FeedbackReview;
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  /** Resolves true when the reply was stored (the draft is then cleared). */
  onReply: (content: string) => Promise<boolean>;
  replyAuthor: string;
  replyAuthorPlaceholder: string;
  onReplyAuthorChange: (value: string) => void;
}) {
  const variantHex = review.variantTitle ? getVariantColorHex(review.variantTitle) : null;
  const hasRating = typeof review.rating === 'number';
  const canReply = review.status === 'pending_review' || review.status === 'approved';
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [replySending, setReplySending] = useState(false);

  async function submitReply() {
    const content = replyDraft.trim();
    if (!content || replySending) return;
    setReplySending(true);
    const ok = await onReply(content);
    setReplySending(false);
    if (ok) {
      setReplyDraft('');
      setReplyOpen(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {hasRating ? (
                <>
                  <StarRating value={review.rating ?? 0} size="sm" />
                  <span className="text-sm font-semibold tabular-nums">{review.rating}/5</span>
                </>
              ) : (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium">
                  ohne Note
                </Badge>
              )}
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
            {!review.title && !review.comment && (
              <p className="text-sm italic text-muted-foreground">
                {hasRating ? 'Nur Sterne-Bewertung, kein Kommentartext.' : 'Kein Text vorhanden.'}
              </p>
            )}
            {review.photos && review.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {review.photos.map(photo => {
                  const url = getFeedbackPhotoPublicUrl(photo.storagePath);
                  return (
                    <a
                      key={photo.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-md overflow-hidden border hover:ring-2 hover:ring-primary transition"
                      title="Foto in voller Größe öffnen"
                    >
                      <img
                        src={url}
                        alt="Bewertungsfoto"
                        loading="lazy"
                        className="h-16 w-16 object-cover"
                      />
                    </a>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5 flex-wrap">
              <span>{review.reviewerDisplayName}</span>
              {review.nameVisibility && (
                <Badge
                  variant="outline"
                  className={
                    review.nameVisibility === 'full'
                      ? 'text-[10px] px-1.5 py-0 bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200'
                      : review.nameVisibility === 'anonymous'
                      ? 'text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                      : 'text-[10px] px-1.5 py-0'
                  }
                  title="So wird der Name öffentlich angezeigt"
                >
                  {review.nameVisibility === 'full'
                    ? 'Klarname'
                    : review.nameVisibility === 'anonymous'
                    ? 'Anonym'
                    : 'Abgekürzt'}
                </Badge>
              )}
              {review.reviewerChildren && review.reviewerChildren.count > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200"
                  title="Eltern-Kontext"
                >
                  {review.reviewerChildren.count} {review.reviewerChildren.count === 1 ? 'Kind' : 'Kinder'}
                  {review.reviewerChildren.ages && review.reviewerChildren.ages.length > 0
                    ? ` · ${review.reviewerChildren.ages.join(', ')} J.`
                    : ''}
                </Badge>
              )}
              <span>
                {review.reviewerCity ? `· ${review.reviewerCity} ` : ''}
                · {new Date(review.createdAt).toLocaleString()}
              </span>
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
          {review.status === 'approved' && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button size="sm" variant="outline" onClick={onHide} className="gap-1">
                <EyeOff className="h-3.5 w-3.5" />
                Ausblenden
              </Button>
            </div>
          )}
        </div>

        {review.replies && review.replies.length > 0 && (
          <div className="space-y-2 border-l-2 border-primary/30 pl-3">
            {review.replies.map(reply => (
              <div key={reply.id} className="text-sm">
                <div className="text-xs text-muted-foreground">
                  Antwort von {reply.authorDisplayName} · {new Date(reply.createdAt).toLocaleString()}
                  {!reply.visible && ' · nicht sichtbar'}
                </div>
                <p className="leading-relaxed break-words whitespace-pre-line">{reply.content}</p>
              </div>
            ))}
          </div>
        )}

        {canReply && !replyOpen && (
          <Button size="sm" variant="ghost" onClick={() => setReplyOpen(true)} className="gap-1 -ml-2">
            <Reply className="h-3.5 w-3.5" />
            Antworten
          </Button>
        )}

        {canReply && replyOpen && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="space-y-1">
              <Label htmlFor={`reply-author-${review.id}`} className="text-xs">
                Antwort als
              </Label>
              <Input
                id={`reply-author-${review.id}`}
                value={replyAuthor}
                onChange={e => onReplyAuthorChange(e.target.value)}
                placeholder={replyAuthorPlaceholder}
                maxLength={80}
                className="h-8 max-w-xs text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`reply-content-${review.id}`} className="text-xs">
                Öffentliche Antwort
              </Label>
              <Textarea
                id={`reply-content-${review.id}`}
                value={replyDraft}
                onChange={e => setReplyDraft(e.target.value)}
                maxLength={REPLY_MAX_LENGTH}
                rows={3}
                placeholder="Antwort schreiben, sie erscheint öffentlich unter der Bewertung."
              />
            </div>
            {review.status === 'pending_review' && (
              <p className="text-xs text-muted-foreground">
                Die Antwort wird erst sichtbar, wenn die Bewertung freigegeben ist.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={submitReply}
                disabled={!replyDraft.trim() || replySending}
                className="gap-1"
              >
                <Reply className="h-3.5 w-3.5" />
                Antwort veröffentlichen
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyOpen(false)}
                disabled={replySending}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
