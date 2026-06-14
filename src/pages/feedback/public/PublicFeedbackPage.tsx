import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, AlertCircle, Sparkles, Heart, Lightbulb, Baby, Plus, Minus, Star } from 'lucide-react';
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
  submitFeedbackIdeaFromRequest,
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
  /** 1–3★ follow-ups */
  lowWhat: string;
  lowExpected: string;
}

/** Fallback logo when the tenant has no branding logo set. Same-origin asset
 *  in /public so it always loads (no cross-origin/hotlink surprises). */
const FAMBLISS_LOGO = '/fambliss-logo-green.png';

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
  const [nameVisibility, setNameVisibility] = useState<'full' | 'abbreviated' | 'anonymous'>('abbreviated');
  // Parent context (optional) — number of children + their ages.
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  // Overall experience + community idea (both land in the idea board / roadmap).
  const [overall, setOverall] = useState('');
  const [ideaText, setIdeaText] = useState('');
  const [ideaPublic, setIdeaPublic] = useState(true);

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
          lowWhat: '',
          lowExpected: '',
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

  async function handleSubmit() {
    if (!token || !data) return;
    setStatus('submitting');
    const children = childrenAges.length > 0
      ? { count: childrenAges.length, ages: childrenAges }
      : null;

    const payload: ReviewSubmitItem[] = ratings
      .filter(r => r.rating > 0)
      .map(r => {
        let comment: string | undefined;
        if (r.rating <= 3) {
          comment = [
            r.lowWhat.trim() && `Was nicht gepasst hat: ${r.lowWhat.trim()}`,
            r.lowExpected.trim() && `Anders vorgestellt: ${r.lowExpected.trim()}`,
          ].filter(Boolean).join('\n\n') || undefined;
        } else {
          comment = r.comment.trim() || undefined;
        }
        return {
          request_id: r.request_id,
          rating: r.rating,
          title: r.title.trim() || undefined,
          comment,
          reviewer_city: city.trim() || undefined,
          name_visibility: nameVisibility,
          reviewer_children: children,
        };
      });

    if (payload.length === 0) {
      setStatus('ready');
      return;
    }

    const res = await submitFeedbackReviews(token, payload);
    if (!res.ok) {
      setStatus('error');
      setErrorCode(res.error || 'submit_failed');
      return;
    }

    // Best-effort: overall experience + community idea → idea board / roadmap.
    if (overall.trim()) {
      await submitFeedbackIdeaFromRequest(token, {
        area: 'general', category: 'praise', body: overall.trim(), is_public_requested: false,
      }).catch(() => { /* non-fatal */ });
    }
    if (ideaText.trim()) {
      await submitFeedbackIdeaFromRequest(token, {
        area: 'products', category: 'new_idea', body: ideaText.trim(), is_public_requested: ideaPublic,
      }).catch(() => { /* non-fatal */ });
    }

    setStatus('submitted');
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
      <PublicShell tenantName={data?.tenant_name} logoUrl={branding?.logoUrl || branding?.logo} accent={primaryColor}>
        <SuccessState customerName={data?.customer_name} tenantName={data?.tenant_name} tenantSlug={data?.tenant_slug} />
      </PublicShell>
    );
  }

  if (!data) return null;

  const firstName = data.customer_name.split(' ')[0];

  // ---------- READY / SUBMITTING ----------
  return (
    <PublicShell tenantName={data.tenant_name} accent={primaryColor} hideHeader>
      {/* HERO — universal, brand-adaptive */}
      <FeedbackHero
        firstName={firstName}
        variantCount={variantCount}
        tenantName={data.tenant_name}
        logoUrl={branding?.logoUrl || branding?.logo}
        accent={primaryColor}
      />

      {/* VARIANT CARDS */}
      <div className="px-4 max-w-2xl mx-auto space-y-4 -mt-8 relative z-10">
        {data.items.map(item => {
          const r = ratings.find(x => x.request_id === item.request_id);
          if (!r) return null;
          const variantHex = item.variant_title ? getVariantColorHex(item.variant_title) : null;
          const hasRating = r.rating > 0;

          return (
            <Card
              key={item.request_id}
              className={`overflow-hidden rounded-2xl border-border/60 shadow-sm transition-all duration-300 ${
                hasRating ? 'ring-2 ring-offset-2 shadow-xl' : 'hover:shadow-md'
              }`}
              style={hasRating ? { borderColor: primaryColor, '--tw-ring-color': primaryColor } as React.CSSProperties : undefined}
            >
              {/* Product image header — full-bleed, name overlaid on a soft scrim */}
              {item.product_image && (
                <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-muted">
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                  {item.variant_title && (
                    <Badge
                      variant="outline"
                      className="absolute left-3 top-3 gap-1.5 px-2.5 py-1 font-semibold border-0 bg-white/85 text-foreground shadow-sm backdrop-blur"
                    >
                      {variantHex && (
                        <span
                          aria-hidden="true"
                          className="inline-block h-3 w-3 rounded-full border border-black/15 shadow-sm"
                          style={{ backgroundColor: variantHex }}
                        />
                      )}
                      {item.variant_title}
                    </Badge>
                  )}
                  <h2 className="absolute inset-x-0 bottom-0 px-4 pb-3 text-left text-lg sm:text-xl font-bold leading-tight text-white drop-shadow">
                    {item.product_name}
                  </h2>
                </div>
              )}

              <CardContent className="p-5 sm:p-6 space-y-4">
                {/* Title block when there is no image header */}
                {!item.product_image && (
                  <div className="space-y-1.5 text-center">
                    <h2 className="font-semibold text-lg leading-tight break-words">
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
                )}

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

                {/* Rating-tailored follow-up — appears as soon as rated */}
                {hasRating && (
                  <div className="space-y-3 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {r.rating >= 4 ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">
                          Was war für dich besonders an {item.product_name}?{' '}
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <Textarea
                          value={r.comment}
                          onChange={e => updateRating(item.request_id, { comment: e.target.value })}
                          placeholder="Erzähl uns, was dich begeistert hat …"
                          maxLength={2000}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Was hat nicht gepasst?</label>
                          <Textarea
                            value={r.lowWhat}
                            onChange={e => updateRating(item.request_id, { lowWhat: e.target.value })}
                            placeholder="Was hat dich gestört oder enttäuscht?"
                            maxLength={1000}
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">Was hättest du dir anders vorgestellt?</label>
                          <Textarea
                            value={r.lowExpected}
                            onChange={e => updateRating(item.request_id, { lowExpected: e.target.value })}
                            placeholder="Wie wäre es für dich perfekt gewesen?"
                            maxLength={1000}
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                      </div>
                    )}
                    <Input
                      value={r.title}
                      onChange={e => updateRating(item.request_id, { title: e.target.value })}
                      placeholder="Kurze Überschrift (optional)"
                      maxLength={120}
                      className="text-sm"
                    />
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

        {/* Parent context (optional) */}
        {anyRated && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Baby className="h-4 w-4 text-muted-foreground" />
              Hast du Kinder? <span className="text-muted-foreground font-normal">(optional)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Anzahl</span>
              <button
                type="button" aria-label="Weniger Kinder"
                onClick={() => setChildrenAges(a => a.slice(0, Math.max(0, a.length - 1)))}
                disabled={childrenAges.length === 0}
                className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">{childrenAges.length}</span>
              <button
                type="button" aria-label="Mehr Kinder"
                onClick={() => setChildrenAges(a => (a.length >= 6 ? a : [...a, 0]))}
                disabled={childrenAges.length >= 6}
                className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {childrenAges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {childrenAges.map((age, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      type="number" min={0} max={17}
                      value={age === 0 ? '' : age}
                      onChange={e => {
                        const v = Math.max(0, Math.min(17, parseInt(e.target.value) || 0));
                        setChildrenAges(a => a.map((x, j) => (j === i ? v : x)));
                      }}
                      placeholder="Alter"
                      className="h-9 w-[72px] text-sm"
                      aria-label={`Alter Kind ${i + 1}`}
                    />
                    <span className="text-xs text-muted-foreground">J.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {anyRated && (() => {
          // Live preview of the published name. The server re-derives this
          // authoritatively from the order name — this is just for the customer.
          const parts = data.customer_name.trim().split(/\s+/);
          const abbreviated = parts[0] + (parts.length > 1 ? ` ${parts[1].charAt(0)}.` : '');
          const previewName =
            nameVisibility === 'full' ? data.customer_name.trim()
            : nameVisibility === 'anonymous' ? 'Anonym'
            : abbreviated;
          const OPTIONS: { value: typeof nameVisibility; label: string }[] = [
            { value: 'full', label: 'Voller Name' },
            { value: 'abbreviated', label: 'Vorname + Initial' },
            { value: 'anonymous', label: 'Anonym' },
          ];
          return (
            <div className="space-y-2">
              <p className="text-xs font-medium text-center">Wie soll dein Name veröffentlicht werden?</p>
              <div className="grid grid-cols-3 gap-2">
                {OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNameVisibility(opt.value)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      nameVisibility === opt.value
                        ? 'border-transparent text-white'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                    style={nameVisibility === opt.value ? { backgroundColor: primaryColor } : undefined}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Angezeigt wird: „{previewName}"{city.trim() ? ` · „${city.trim()}"` : ''}.
              </p>
            </div>
          );
        })()}

        {/* Overall experience */}
        {anyRated && (
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <label className="block text-sm font-medium">Dein Gesamteindruck <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea
              value={overall}
              onChange={e => setOverall(e.target.value)}
              placeholder="Magst du uns mehr über dein Fambliss-Erlebnis erzählen?"
              maxLength={2000}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        )}

        {/* Ideas / roadmap — community */}
        {anyRated && (
          <div
            className="rounded-2xl border-2 p-4 space-y-3"
            style={{ borderColor: '#c7d1c0', background: 'rgba(199,209,192,0.14)' }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: primaryColor }}>
              <Lightbulb className="h-4 w-4" />
              Deine Idee für Fambliss
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Wir entwickeln Fambliss gemeinsam mit euch. Teile deine Idee — sie landet auf unserer Roadmap und wird von uns geprüft.
            </p>
            <div className="flex items-center justify-center gap-2 py-1 text-[11px] font-medium text-muted-foreground">
              <span>Idee</span><span aria-hidden>→</span><span>In Prüfung</span><span aria-hidden>→</span><span>Umgesetzt</span>
            </div>
            <Textarea
              value={ideaText}
              onChange={e => setIdeaText(e.target.value)}
              placeholder="Was würdest du dir von Fambliss wünschen?"
              maxLength={1000}
              rows={3}
              className="text-sm resize-none bg-background"
            />
            {ideaText.trim() && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={ideaPublic} onChange={e => setIdeaPublic(e.target.checked)} className="rounded" />
                Meine Idee darf öffentlich auf der Roadmap erscheinen
              </label>
            )}
          </div>
        )}

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
  /** Tenant primary color — used for a faint page-background tint. */
  accent?: string;
  /** Hide the slim logo header (the hero band carries the logo itself). */
  hideHeader?: boolean;
}

function PublicShell({ children, tenantName, logoUrl, accent, hideHeader }: ShellProps) {
  useEffect(() => {
    if (tenantName) document.title = `Feedback · ${tenantName}`;
  }, [tenantName]);

  const pageStyle = accent
    ? { backgroundColor: `color-mix(in srgb, ${accent} 4%, #fafaf9)` }
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20" style={pageStyle}>
      {!hideHeader && (
        <header className="px-4 pt-6 pb-1 flex items-center justify-center">
          <span
            className="inline-flex items-center justify-center rounded-2xl px-5 py-3 shadow-md ring-1 ring-black/10"
            style={accent ? { backgroundImage: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, #000))` } : undefined}
          >
            <img
              src={logoUrl || FAMBLISS_LOGO}
              alt={tenantName || 'Feedback'}
              className="h-9 max-w-[160px] object-contain"
            />
          </span>
        </header>
      )}
      {children}
    </div>
  );
}

/** Decorative sparkles scattered around the hero's negative space (avoids the
 *  center where the greeting sits). Positions are percentages. */
const HERO_SPARKLES: { left: string; top: string; size: string; opacity: number; delay: string; icon: 'star' | 'sparkle' }[] = [
  { left: '12%', top: '30%', size: 'h-3.5 w-3.5', opacity: 0.55, delay: '0s', icon: 'sparkle' },
  { left: '83%', top: '20%', size: 'h-4 w-4', opacity: 0.7, delay: '0.7s', icon: 'star' },
  { left: '24%', top: '64%', size: 'h-2.5 w-2.5', opacity: 0.45, delay: '1.3s', icon: 'star' },
  { left: '72%', top: '60%', size: 'h-3.5 w-3.5', opacity: 0.6, delay: '1.9s', icon: 'sparkle' },
  { left: '92%', top: '48%', size: 'h-2.5 w-2.5', opacity: 0.4, delay: '2.5s', icon: 'star' },
  { left: '7%', top: '52%', size: 'h-3 w-3', opacity: 0.5, delay: '1.0s', icon: 'star' },
];

interface HeroProps {
  firstName: string;
  variantCount: number;
  tenantName: string;
  logoUrl?: string;
  accent: string;
}

/**
 * Universal, brand-adaptive hero band. Everything recolors from the tenant's
 * `accent` (primaryColor) via color-mix — no industry-specific imagery, so it
 * fits any tenant. Layered radial gradient mesh + drifting soft blobs +
 * twinkling review-stars, with a curved bottom edge the cards rise into.
 */
function FeedbackHero({ firstName, variantCount, tenantName, logoUrl, accent }: HeroProps) {
  const tint = (p: number) => `color-mix(in srgb, ${accent} ${p}%, transparent)`;

  return (
    <section className="relative overflow-hidden">
      {/* Gradient mesh background */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundColor: `color-mix(in srgb, ${accent} 8%, #fdfdfc)`,
          backgroundImage: [
            `radial-gradient(60% 70% at 12% -10%, ${tint(36)}, transparent 70%)`,
            `radial-gradient(55% 60% at 100% 6%, ${tint(22)}, transparent 65%)`,
            `radial-gradient(75% 60% at 50% 122%, ${tint(28)}, transparent 60%)`,
          ].join(','),
        }}
      />
      {/* Drifting soft blobs */}
      <div aria-hidden className="absolute -left-12 top-8 h-40 w-40 rounded-full blur-3xl animate-feedback-blob" style={{ background: tint(34) }} />
      <div aria-hidden className="absolute -right-10 top-24 h-32 w-32 rounded-full blur-3xl animate-feedback-blob" style={{ background: tint(24), animationDelay: '4s' }} />

      {/* Twinkling stars / sparkles */}
      {HERO_SPARKLES.map((s, i) => {
        const Icon = s.icon === 'star' ? Star : Sparkles;
        return (
          <Icon
            key={i}
            aria-hidden
            className={`absolute ${s.size} ${s.icon === 'star' ? 'fill-current' : ''} animate-feedback-twinkle animate-feedback-float`}
            style={{ left: s.left, top: s.top, color: accent, opacity: s.opacity, animationDelay: s.delay }}
          />
        );
      })}

      {/* Content */}
      <div className="relative px-5 pt-9 pb-20 text-center">
        {/* Logo pill — accent backing so white *and* dark tenant logos stay
            legible (a plain white pill makes white logos disappear). */}
        <div
          className="mx-auto mb-5 inline-flex items-center justify-center rounded-2xl px-5 py-3 shadow-md ring-1 ring-black/10 animate-feedback-rise"
          style={{ backgroundImage: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, #000))` }}
        >
          <img src={logoUrl || FAMBLISS_LOGO} alt={tenantName} className="h-9 max-w-[160px] object-contain" />
        </div>

        {/* Verified badge */}
        <div className="animate-feedback-rise" style={{ animationDelay: '0.05s' }}>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.7)', color: accent }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Verifizierte Bewertung
          </span>
        </div>

        <h1
          className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight animate-feedback-rise"
          style={{ animationDelay: '0.1s' }}
        >
          Hallo {firstName}!
        </h1>
        <p
          className="mt-2.5 mx-auto max-w-md text-[15px] sm:text-base text-foreground/70 animate-feedback-rise"
          style={{ animationDelay: '0.16s' }}
        >
          Wie war {variantCount === 1 ? 'dein Produkt' : 'deine Bestellung'} von{' '}
          <span className="font-semibold text-foreground">{tenantName}</span>?
        </p>

        {/* Star hint chip */}
        <div
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/65 px-4 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur animate-feedback-rise"
          style={{ animationDelay: '0.22s' }}
        >
          <span className="inline-flex items-center gap-0.5">
            {[0, 1, 2, 3, 4].map(i => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: accent }} />
            ))}
          </span>
          <span className="text-xs font-medium text-foreground/75">Tippe auf die Sterne</span>
        </div>
      </div>

      {/* Curved bottom edge — cards rise into it */}
      <svg
        aria-hidden
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-10 w-full"
      >
        <path d="M0,80 L0,40 Q720,90 1440,40 L1440,80 Z" fill={`color-mix(in srgb, ${accent} 4%, #fafaf9)`} />
      </svg>
    </section>
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

function SuccessState({ customerName, tenantName, tenantSlug }: { customerName?: string; tenantName?: string; tenantSlug?: string }) {
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
      {tenantSlug && (
        <a
          href={`/ideas/${tenantSlug}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
        >
          <Lightbulb className="h-4 w-4" />
          Schau dir unsere Roadmap an
        </a>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Danke, dass du Fambliss mitgestaltest. 🌿 Du kannst diese Seite jetzt schließen.
      </p>
    </div>
  );
}
