import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Bug,
  Star as StarIcon,
  Heart,
  AlertCircle,
  ChevronRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { StarRating } from '@/components/feedback/StarRating';
import {
  getIdeaInviteByToken,
  submitIdea,
} from '@/services/supabase/feedback-public';
import type {
  PublicIdeaInvite,
  FeedbackIdeaArea,
  FeedbackIdeaCategory,
} from '@/types/feedback';

const CATEGORIES: Array<{
  id: FeedbackIdeaCategory;
  label: string;
  icon: typeof Lightbulb;
  color: string;
}> = [
  { id: 'improvement', label: 'Verbesserung', icon: Sparkles, color: 'text-blue-600' },
  { id: 'new_idea', label: 'Neue Idee', icon: Lightbulb, color: 'text-amber-600' },
  { id: 'bug', label: 'Fehler', icon: Bug, color: 'text-red-600' },
  { id: 'praise', label: 'Lob', icon: Heart, color: 'text-pink-600' },
  { id: 'other', label: 'Sonstiges', icon: StarIcon, color: 'text-slate-600' },
];

const AREAS: Array<{ id: FeedbackIdeaArea; label: string }> = [
  { id: 'app_portal', label: 'App & Portal' },
  { id: 'products', label: 'Produkte' },
  { id: 'general', label: 'Allgemein' },
];

type Status = 'loading' | 'ready' | 'submitting' | 'submitted' | 'error';

export function PublicIdeaSubmitPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [errorCode, setErrorCode] = useState<string | null>(token ? null : 'missing_token');
  const [invite, setInvite] = useState<PublicIdeaInvite | null>(null);

  const [area, setArea] = useState<FeedbackIdeaArea>('app_portal');
  const [category, setCategory] = useState<FeedbackIdeaCategory>('improvement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await getIdeaInviteByToken(token);
      if (cancelled) return;
      if ('error' in res) {
        setStatus('error');
        setErrorCode(res.error);
        return;
      }
      setInvite(res);
      setStatus('ready');
    })();
    return () => { cancelled = true; };
  }, [token]);

  const branding = invite?.tenant_branding as Record<string, string> | undefined;
  const primaryColor = branding?.primaryColor || '#3B82F6';

  useEffect(() => {
    document.documentElement.style.setProperty('--feedback-accent', primaryColor);
  }, [primaryColor]);

  const valid = title.trim().length >= 4 && body.trim().length >= 10;

  async function handleSubmit() {
    if (!token || !valid) return;
    setStatus('submitting');
    const res = await submitIdea(token, {
      area,
      category,
      title: title.trim(),
      body: body.trim(),
      rating: rating > 0 ? rating : undefined,
      is_public_requested: isPublic,
    });
    if (res.ok) {
      setStatus('submitted');
    } else {
      setStatus('error');
      setErrorCode(res.error || 'submit_failed');
    }
  }

  if (status === 'loading') {
    return (
      <Shell tenantName="">
        <div className="px-4 pt-8 max-w-2xl mx-auto space-y-3">
          <ShimmerSkeleton className="h-12 w-2/3 mx-auto" />
          <ShimmerSkeleton className="h-80 w-full" />
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell tenantName={invite?.tenant_name}>
        <IdeaErrorState code={errorCode} />
      </Shell>
    );
  }

  if (status === 'submitted') {
    return (
      <Shell tenantName={invite?.tenant_name} logoUrl={branding?.logoUrl}>
        <IdeaSuccess
          tenantName={invite?.tenant_name}
          tenantSlug={invite?.tenant_slug}
          token={token}
          partnerName={invite?.partner_name}
          navigate={navigate}
        />
      </Shell>
    );
  }

  if (!invite) return null;
  const firstName = invite.partner_name.split(' ')[0];

  return (
    <Shell tenantName={invite.tenant_name} logoUrl={branding?.logoUrl}>
      {/* HERO */}
      <div className="px-4 pt-8 pb-2 text-center">
        <Badge variant="outline" className="mb-3 gap-1 bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200">
          <Sparkles className="h-3 w-3" />
          Deine Stimme gestaltet {invite.tenant_name}
        </Badge>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          Feedback &amp; Produkt-Ideen
        </h1>
        <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Hallo {firstName} — was würdest du verändern? Was fehlt? Was hast du gefeiert? Dein
          Feedback fließt direkt in den Produkt-Roadmap-Prozess ein.
        </p>
      </div>

      {/* FORM */}
      <div className="px-4 max-w-2xl mx-auto mt-4 pb-12">
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <h2 className="text-lg font-semibold">Neu einreichen</h2>

            {/* Area */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Worum geht's?</label>
              <div className="flex flex-wrap gap-2">
                {AREAS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setArea(a.id)}
                    className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                      area === a.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                    style={area === a.id ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Art des Feedbacks</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CATEGORIES.map(c => {
                  const Icon = c.icon;
                  const selected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all ${
                        selected
                          ? 'border-2 bg-card shadow-md scale-105'
                          : 'border bg-card/50 hover:bg-card'
                      }`}
                      style={selected ? { borderColor: primaryColor } : undefined}
                    >
                      <Icon className={`h-5 w-5 ${c.color}`} />
                      <span className="font-medium">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Titel · kurz &amp; prägnant</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="z. B. Dashboard sollte Streak anzeigen"
                maxLength={120}
              />
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Deine Idee / Dein Feedback</label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Beschreibe so detailliert wie möglich: Was fällt dir auf? Was wünschst du dir? Welcher konkrete Use-Case steckt dahinter?"
                maxLength={6000}
                rows={6}
              />
              <p className="text-[10px] text-muted-foreground text-right">{body.length} / 6000</p>
            </div>

            {/* Optional rating */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bewertung (optional)</label>
              <StarRating value={rating} onChange={n => setRating(n)} size="md" color={primaryColor} />
            </div>

            {/* Public toggle */}
            <label className="flex items-start gap-2 cursor-pointer text-sm pt-2 border-t border-border">
              <Checkbox
                checked={isPublic}
                onCheckedChange={v => setIsPublic(!!v)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Auf dem Ideen-Board veröffentlichen</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Andere Partner sehen deinen Vorschlag und können ihn mit einem ⭐ unterstützen.
                </span>
              </span>
            </label>

            <Button
              onClick={handleSubmit}
              disabled={!valid || status === 'submitting'}
              className="w-full h-12 text-base font-semibold gap-2"
              style={valid ? { backgroundColor: primaryColor } : undefined}
            >
              {status === 'submitting' ? 'Wird gesendet…' : 'Feedback abschicken'}
              {valid && status !== 'submitting' && <ChevronRight className="h-5 w-5" />}
            </Button>

            <p className="text-[11px] text-muted-foreground text-center">
              Dein Beitrag wird vor der Veröffentlichung von {invite.tenant_name} geprüft.
            </p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  tenantName,
  logoUrl,
}: {
  children: React.ReactNode;
  tenantName?: string;
  logoUrl?: string;
}) {
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

function IdeaErrorState({ code }: { code: string | null }) {
  let title = 'Hier ist etwas schiefgelaufen';
  let message = 'Bitte versuche es später noch einmal.';
  if (code === 'expired') {
    title = 'Dieser Link ist abgelaufen';
    message = 'Bitte kontaktiere den Händler für einen neuen Link.';
  } else if (code === 'not_found' || code === 'missing_token') {
    title = 'Link nicht gefunden';
    message = 'Der Link scheint ungültig zu sein.';
  } else if (code === 'cancelled') {
    title = 'Einladung wurde widerrufen';
    message = 'Diese Einladung wurde vom Händler beendet.';
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

function IdeaSuccess({
  tenantName,
  tenantSlug,
  token,
  partnerName,
  navigate,
}: {
  tenantName?: string;
  tenantSlug?: string;
  token?: string;
  partnerName?: string;
  navigate: (path: string) => void;
}) {
  const firstName = (partnerName || '').split(' ')[0];
  return (
    <div className="max-w-md mx-auto px-4 pt-16 text-center">
      <div className="h-24 w-24 mx-auto rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-in zoom-in-95 duration-500">
        <Check className="h-12 w-12 text-white" strokeWidth={3} />
      </div>
      <h1 className="mt-6 text-2xl sm:text-3xl font-bold">
        Danke{firstName ? `, ${firstName}` : ''}!
      </h1>
      <p className="mt-3 text-muted-foreground">
        Dein Vorschlag wurde gesendet. {tenantName} prüft ihn und veröffentlicht ihn nach Freigabe
        auf dem Ideen-Board.
      </p>
      {tenantSlug && (
        <Button
          className="mt-6"
          onClick={() => navigate(`/ideas/${tenantSlug}${token ? `?vote=${token}` : ''}`)}
        >
          Ideen-Board ansehen
        </Button>
      )}
    </div>
  );
}
