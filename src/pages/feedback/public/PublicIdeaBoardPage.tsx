import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Star, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getPublicIdeasForTenant,
  voteIdea,
  unvoteIdea,
} from '@/services/supabase/feedback-public';
import type { PublicFeedbackIdea, FeedbackIdeaStatus } from '@/types/feedback';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Public idea board — anyone can browse, voting requires the partner's
 * invite token in the URL (?vote=:token). Local-storage caches whether
 * the visitor has voted so the UI is instant.
 */
export function PublicIdeaBoardPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [params] = useSearchParams();
  const voteToken = params.get('vote');

  // Persist voted-state locally so the partner sees their up-vote
  // even after a refresh (UI optimism; the server is authoritative).
  const storageKey = voteToken ? `feedback-voted-${voteToken}` : null;

  const [ideas, setIdeas] = useState<PublicFeedbackIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedbackIdeaStatus | 'all'>('all');
  const [votedIds, setVotedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined' || !storageKey) return new Set();
    try {
      const cached = localStorage.getItem(storageKey);
      return cached ? new Set(JSON.parse(cached)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getPublicIdeasForTenant({
      tenantSlug,
      status: tab === 'all' ? undefined : tab,
      limit: 100,
    }).then(list => {
      if (cancelled) return;
      setIdeas(list);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [tenantSlug, tab]);

  async function handleVote(idea: PublicFeedbackIdea) {
    if (!voteToken) {
      toast.error('Zum Voten brauchst du den Link aus deiner Email.');
      return;
    }
    setVoting(idea.id);
    const isVoted = votedIds.has(idea.id);
    const res = isVoted
      ? await unvoteIdea(voteToken, idea.id)
      : await voteIdea(voteToken, idea.id);
    setVoting(null);
    if (!res.ok) {
      toast.error(res.error || 'Fehler beim Voten');
      return;
    }
    setIdeas(curr =>
      curr.map(i =>
        i.id === idea.id ? { ...i, upvote_count: res.upvoteCount ?? i.upvote_count } : i,
      ),
    );
    const next = new Set(votedIds);
    if (isVoted) next.delete(idea.id);
    else next.add(idea.id);
    setVotedIds(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch (_err) {
        void _err;
      }
    }
  }

  const inProgressCount = ideas.filter(i => i.status === 'in_progress').length;
  const doneCount = ideas.filter(i => i.status === 'done').length;
  const totalCount = ideas.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="text-center mb-6">
          <Badge variant="outline" className="mb-3 gap-1 bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200">
            <Star className="h-3 w-3" />
            Ideen-Board
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Was kommt als nächstes?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Vorschläge unserer Partner. Stimme mit einem ⭐ für die Ideen ab, die du am wichtigsten findest.
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatCard label="Gesamt" value={totalCount} />
          <StatCard label="In Prüfung" value={inProgressCount} accent />
          <StatCard label="Umgesetzt ✨" value={doneCount} />
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as FeedbackIdeaStatus | 'all')}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="published">Vorgeschlagen</TabsTrigger>
            <TabsTrigger value="in_progress">In Prüfung</TabsTrigger>
            <TabsTrigger value="done">Umgesetzt</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3 mt-5">
          {loading ? (
            <>
              <ShimmerSkeleton className="h-24 w-full" />
              <ShimmerSkeleton className="h-24 w-full" />
              <ShimmerSkeleton className="h-24 w-full" />
            </>
          ) : ideas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Noch keine Ideen in diesem Bereich. Werde der/die Erste!
              </CardContent>
            </Card>
          ) : (
            ideas.map(idea => {
              const isVoted = votedIds.has(idea.id);
              return (
                <Card
                  key={idea.id}
                  className={cn(
                    'transition-shadow hover:shadow-md',
                    idea.status === 'done' && 'bg-emerald-50/30 dark:bg-emerald-900/10',
                  )}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      {/* Vote button */}
                      <button
                        type="button"
                        onClick={() => handleVote(idea)}
                        disabled={!voteToken || voting === idea.id}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-lg border-2 shrink-0 w-14 h-14 transition-all',
                          isVoted
                            ? 'bg-primary text-primary-foreground border-primary scale-105'
                            : 'bg-card hover:bg-muted border-border',
                          !voteToken && 'opacity-60 cursor-not-allowed',
                        )}
                        aria-label={isVoted ? 'Vote entfernen' : 'Voten'}
                      >
                        {voting === idea.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronUp className="h-5 w-5" />
                        )}
                        <span className="text-xs font-bold tabular-nums">{idea.upvote_count}</span>
                      </button>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CategoryBadge category={idea.category} />
                          <AreaBadge area={idea.area} />
                          <StatusBadge status={idea.status} />
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base leading-tight break-words">
                          {idea.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed break-words line-clamp-3">
                          {idea.body}
                        </p>
                        {idea.admin_response && (
                          <div className="mt-2 rounded-md bg-primary/5 border-l-2 border-primary p-2.5 text-xs">
                            <div className="font-semibold mb-0.5">Antwort vom Team:</div>
                            <p className="text-muted-foreground leading-relaxed">{idea.admin_response}</p>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground pt-1">
                          {idea.submitter_display_name} ·{' '}
                          {new Date(idea.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {!voteToken && (
          <Card className="mt-6 bg-muted/30 border-dashed">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              💡 Zum Voten brauchst du den persönlichen Link aus deiner Einladungs-Email.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={accent ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10' : ''}>
      <CardContent className="p-3 text-center">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    improvement: { label: 'Verbesserung', cls: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200' },
    new_idea: { label: 'Neue Idee', cls: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200' },
    bug: { label: 'Fehler', cls: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200' },
    praise: { label: 'Lob', cls: 'bg-pink-50 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-200' },
    other: { label: 'Sonstiges', cls: 'bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-900/30 dark:text-slate-200' },
  };
  const v = map[category] || map.other;
  return <Badge variant="outline" className={cn('text-[10px]', v.cls)}>{v.label}</Badge>;
}

function AreaBadge({ area }: { area: string }) {
  const map: Record<string, string> = {
    app_portal: 'App & Portal',
    products: 'Produkte',
    general: 'Allgemein',
  };
  return (
    <Badge variant="outline" className="text-[10px] bg-muted">
      {map[area] || area}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') return null;
  const map: Record<string, { label: string; cls: string }> = {
    in_progress: { label: 'In Prüfung', cls: 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-900/40 dark:text-amber-100' },
    done: { label: '✨ Umgesetzt', cls: 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-100' },
  };
  const v = map[status];
  if (!v) return null;
  return <Badge variant="outline" className={cn('text-[10px] font-semibold', v.cls)}>{v.label}</Badge>;
}
