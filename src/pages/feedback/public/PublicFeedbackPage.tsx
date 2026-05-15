import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, AlertCircle, Sparkles, ChevronDown, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { StarRating } from '@/components/feedback/StarRating';
import {
  getFeedbackRequestByToken,
  submitFeedbackReviews,
  type ReviewSubmitItem,
} from '@/services/supabase/feedback-public';
import { getVariantColorHex } from '@/lib/variant-color';
import type { PublicFeedbackRequest } from '@/types/feedback';

type Status = 'loading' | 'ready' | 'submitting' | 'submitted' | 'error';

interface RatingState {
  request_id: string;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
}

/**
 * Public, token-protected feedback submission page.
 * Mobile-first 2-step UX:
 *   Step 1: HUGE stars per variant (single-tap completion in <5s)
 *   Step 2: Optional title + comment + city (slide-in)
 *   Step 3: Success with subtle delight
 */
export function PublicFeedbackPage() {
  const { token } = useParams<{ token: string }>();

  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [errorCode, setErrorCode] = useState<string | null>(token ? null : 'missing_token');
  const [data, setData] = useState<PublicFeedbackRequest | null>(null);
  const [ratings, setRatings] = useState<RatingState[]>([]);
  const [city, setCity] = useState('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await getFeedbackRequestByToken(token);
      if (cancelled) return;
      if ('error' in res) {
        setStatus('error');
        setErrorCode(res.error);
        return;
      }
      setData(res);
      setRatings(
        res.items.map(it => ({
          request_id: it.request_id,
          rating: 0,
          title: '',
          comment: '',
        })),
      );
      setStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const branding = data?.tenant_branding as Record<string, string> | undefined;
  const primaryColor = branding?.primaryColor || '#F59E0B';

  // Apply tenant primary color to CSS var while this page is mounted
  useEffect(() => {
    if (!primaryColor) return;
    const prev = document.documentElement.style.getPropertyValue('--feedback-accent');
    document.documentElement.style.setProperty('--feedback-accent', primaryColor);
    return () => {
      document.documentElement.style.setProperty('--feedback-accent', prev);
    };
  }, [primaryColor]);

  const anyRated = ratings.some(r => r.rating > 0);
  const allRated = ratings.every(r => r.rating > 0);
  const variantCount = data?.items.length || 0;

  function updateRating(req_id: string, patch: Partial<RatingState>) {
    setRatings(rs => rs.map(r => (r.request_id === req_id ? { ...r, ...patch } : r)));
  }

  function toggleDetails(req_id: string) {
    setExpandedDetails(prev => ({ ...prev, [req_id]: !prev[req_id] }));
  }

  async function handleSubmit() {
    if (!token || !data) return;
    setStatus('submitting');
    const payload: ReviewSubmitItem[] = ratings
      .filter(r => r.rating > 0)
      .map(r => ({
        request_id: r.request_id,
        rating: r.rating,
        title: r.title.trim() || undefined,
        comment: r.comment.trim() || undefined,
        reviewer_city: city.trim() || undefined,
      }));
    if (payload.length === 0) {
      setStatus('ready');
      return;
    }
    const res = await submitFeedbackReviews(token, payload);
    if (res.ok) {
      setStatus('submitted');
    } else {
      setStatus('error');
      setErrorCode(res.error || 'submit_failed');
    }
  }

  // ---------- LOADING ----------
  if (status === 'loading') {
    return (
      <PublicShell>
        <div className="space-y-4 max-w-xl mx-auto px-4 pt-8">
          <ShimmerSkeleton className="h-12 w-3/4 mx-auto" />
          <ShimmerSkeleton className="h-6 w-1/2 mx-auto" />
          <div className="space-y-3 pt-4">
            <ShimmerSkeleton className="h-40 w-full" />
            <ShimmerSkeleton className="h-40 w-full" />
          </div>
        </div>
      </PublicShell>
    );
  }

  // ---------- ERROR ----------
  if (status === 'error') {
    return (
      <PublicShell tenantName={data?.tenant_name}>
        <ErrorState code={errorCode} />
      </PublicShell>
    );
  }

  // ---------- SUBMITTED ----------
  if (status === 'submitted') {
    return (
      <PublicShell tenantName={data?.tenant_name} logoUrl={branding?.logoUrl}>
        <SuccessState customerName={data?.customer_name} tenantName={data?.tenant_name} />
      </PublicShell>
    );
  }

  if (!data) return null;

  const firstName = data.customer_name.split(' ')[0];

  // ---------- READY / SUBMITTING ----------
  return (
    <PublicShell tenantName={data.tenant_name} logoUrl={branding?.logoUrl}>
      {/* HERO */}
      <div className="px-4 pt-8 pb-2 text-center">
        <Badge variant="outline" className="mb-3 gap-1 bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200">
          <Sparkles className="h-3 w-3" />
          Verifizierte Bewertung
        </Badge>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          Hallo {firstName}!
        </h1>
        <p className="mt-2 text-muted-foreground text-sm sm:text-base">
          Wie war {variantCount === 1 ? 'dein Produkt' : 'deine Bestellung'} von {data.tenant_name}?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Tippe auf die Sterne — eine kurze Bewertung reicht aus.</p>
      </div>

      {/* VARIANT CARDS */}
      <div className="px-4 max-w-2xl mx-auto space-y-3 mt-4">
        {data.items.map(item => {
          const r = ratings.find(x => x.request_id === item.request_id);
          if (!r) return null;
          const variantHex = item.variant_title ? getVariantColorHex(item.variant_title) : null;
          const isExpanded = expandedDetails[item.request_id] || false;
          const hasRating = r.rating > 0;

          return (
            <Card
              key={item.request_id}
              className={`overflow-hidden transition-all duration-300 ${
                hasRating ? 'ring-2 ring-offset-2 shadow-lg' : ''
              }`}
              style={hasRating ? { borderColor: primaryColor, '--tw-ring-color': primaryColor } as React.CSSProperties : undefined}
            >
              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Product header */}
                <div className="flex items-start gap-3">
                  {item.product_image && (
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                      <img
                        src={item.product_image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="font-semibold text-base sm:text-lg leading-tight break-words">
                      {item.product_name}
                    </h2>
                    {item.variant_title && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 px-2 py-0.5 font-semibold border-2 bg-violet-50 text-violet-900 border-violet-300 dark:bg-violet-900/30 dark:text-violet-100 dark:border-violet-700"
                      >
                        {variantHex && (
                          <span
                            aria-hidden="true"
                            className="inline-block h-3 w-3 rounded-full border border-black/20 shadow-sm"
                            style={{ backgroundColor: variantHex }}
                          />
                        )}
                        {item.variant_title}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stars — the centerpiece */}
                <div className="flex justify-center py-2">
                  <StarRating
                    value={r.rating}
                    size="xl"
                    color={primaryColor}
                    onChange={n => updateRating(item.request_id, { rating: n })}
                    label={`Bewertung für ${item.product_name}`}
                  />
                </div>

                {/* Rating label that appears once rated */}
                {hasRating && (
                  <div className="text-center text-sm font-medium animate-in fade-in slide-in-from-bottom-1 duration-300">
                    {RATING_LABELS[r.rating]}
                  </div>
                )}

                {/* Step 2: optional details (collapsible) */}
                {hasRating && (
                  <div className="space-y-2 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button
                      type="button"
                      onClick={() => toggleDetails(item.request_id)}
                      className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      <span>{isExpanded ? 'Details ausblenden' : 'Möchtest du mehr sagen? (optional)'}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Input
                          value={r.title}
                          onChange={e => updateRating(item.request_id, { title: e.target.value })}
                          placeholder="Eine kurze Überschrift (optional)"
                          maxLength={120}
                          className="text-sm"
                        />
                        <Textarea
                          value={r.comment}
                          onChange={e => updateRating(item.request_id, { comment: e.target.value })}
                          placeholder="Was hat dir gefallen? Was würdest du anderen sagen?"
                          maxLength={2000}
                          rows={4}
                          className="text-sm resize-none"
                        />
                        <p className="text-[10px] text-muted-foreground text-right">
                          {r.comment.length} / 2000
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer / submit */}
      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-3">
        {anyRated && (
          <Input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Aus welcher Stadt? (optional, max. 80)"
            maxLength={80}
            className="text-sm"
          />
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Es wird nur dein Vorname mit Anfangsbuchstabe des Nachnamens veröffentlicht
          {city.trim() ? ` und „${city.trim()}"` : ''}.
        </p>

        <Button
          onClick={handleSubmit}
          disabled={!anyRated || status === 'submitting'}
          className="w-full h-12 text-base font-semibold gap-2"
          style={anyRated ? { backgroundColor: primaryColor } : undefined}
        >
          {status === 'submitting' ? (
            <>Wird gesendet…</>
          ) : (
            <>
              <Heart className="h-5 w-5" fill={anyRated ? 'currentColor' : 'none'} />
              {allRated || ratings.length === 1
                ? 'Bewertung senden'
                : `${ratings.filter(r => r.rating > 0).length} von ${ratings.length} Bewertungen senden`}
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center pt-2 pb-8">
          Diese Bewertung wird vor der Veröffentlichung von {data.tenant_name} geprüft.
        </p>
      </div>
    </PublicShell>
  );
}

// ============================================
// Sub-components
// ============================================

const RATING_LABELS: Record<number, string> = {
  1: '😞 Nicht so gut',
  2: '🙁 Geht so',
  3: '🙂 Okay',
  4: '😊 Sehr gut',
  5: '🤩 Begeistert!',
};

interface ShellProps {
  children: React.ReactNode;
  tenantName?: string;
  logoUrl?: string;
}

function PublicShell({ children, tenantName, logoUrl }: ShellProps) {
  useEffect(() => {
    if (tenantName) document.title = `Feedback · ${tenantName}`;
  }, [tenantName]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="px-4 pt-4 flex items-center justify-center gap-2">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName || ''} className="h-7 max-w-[140px] object-contain" />
        ) : tenantName ? (
          <div className="text-sm font-semibold text-muted-foreground">{tenantName}</div>
        ) : null}
      </header>
      {children}
    </div>
  );
}

function ErrorState({ code }: { code: string | null }) {
  let title = 'Hier ist etwas schiefgelaufen';
  let message = 'Bitte versuche es später noch einmal.';
  if (code === 'expired') {
    title = 'Dieser Link ist abgelaufen';
    message = 'Der Bewertungs-Link ist nicht mehr gültig. Bitte kontaktiere den Händler, falls du noch Feedback geben möchtest.';
  } else if (code === 'not_found' || code === 'missing_token') {
    title = 'Link nicht gefunden';
    message = 'Der Link scheint ungültig zu sein. Bitte überprüfe deine Email noch einmal.';
  } else if (code === 'already_submitted') {
    title = 'Schon bewertet';
    message = 'Du hast für diese Bestellung bereits eine Bewertung abgegeben. Vielen Dank!';
  }
  return (
    <div className="max-w-md mx-auto px-4 pt-12">
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SuccessState({ customerName, tenantName }: { customerName?: string; tenantName?: string }) {
  const firstName = (customerName || '').split(' ')[0];
  return (
    <div className="max-w-md mx-auto px-4 pt-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-primary/10 animate-pulse" />
        </div>
        <div className="h-24 w-24 mx-auto rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-in zoom-in-95 duration-500">
          <Check className="h-12 w-12 text-white" strokeWidth={3} />
        </div>
      </div>
      <h1 className="mt-6 text-2xl sm:text-3xl font-bold animate-in fade-in slide-in-from-bottom-2 duration-700">
        Danke{firstName ? `, ${firstName}` : ''}!
      </h1>
      <p className="mt-3 text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
        Deine Bewertung wurde gesendet. {tenantName} prüft sie und veröffentlicht sie in Kürze.
      </p>
      <p className="mt-8 text-xs text-muted-foreground">
        Du kannst diese Seite jetzt schließen.
      </p>
    </div>
  );
}
