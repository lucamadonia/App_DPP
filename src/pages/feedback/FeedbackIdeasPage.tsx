import { useEffect, useState } from 'react';
import { Check, X, Lightbulb, Sparkles, ChevronUp, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getIdeas,
  publishIdea,
  rejectIdea,
  setIdeaStatus,
  setIdeaAdminResponse,
  getIdeaStats,
  type IdeaStats,
} from '@/services/supabase/feedback-ideas';
import type {
  FeedbackIdea,
  FeedbackIdeaStatus,
  FeedbackIdeaRoadmapStatus,
} from '@/types/feedback';
import { toast } from 'sonner';
import { StarRating } from '@/components/feedback/StarRating';
import { cn } from '@/lib/utils';

export function FeedbackIdeasPage() {
  const [tab, setTab] = useState<FeedbackIdeaStatus>('pending_review');
  const [ideas, setIdeas] = useState<FeedbackIdea[]>([]);
  const [stats, setStats] = useState<IdeaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseDraft, setResponseDraft] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    const [list, s] = await Promise.all([
      getIdeas({ status: tab, limit: 100 }),
      getIdeaStats(),
    ]);
    setIdeas(list);
    setStats(s);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handlePublish(idea: FeedbackIdea) {
    try {
      await publishIdea(idea.id, {
        adminResponse: responseDraft[idea.id] || idea.adminResponse,
      });
      toast.success('Idee veröffentlicht');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleReject(idea: FeedbackIdea) {
    try {
      await rejectIdea(idea.id);
      toast.success('Idee abgelehnt');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleMoveStatus(idea: FeedbackIdea, status: FeedbackIdeaStatus, roadmap?: FeedbackIdeaRoadmapStatus) {
    try {
      await setIdeaStatus(idea.id, status, roadmap);
      toast.success('Status aktualisiert');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSaveResponse(idea: FeedbackIdea) {
    const text = responseDraft[idea.id];
    if (text == null) return;
    try {
      await setIdeaAdminResponse(idea.id, text);
      toast.success('Antwort gespeichert');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-6 w-6" />
          Ideen-Board
        </h1>
        <p className="text-sm text-muted-foreground">
          Partner-Vorschläge prüfen, veröffentlichen und auf der Roadmap nachverfolgen.
        </p>
      </div>

      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Kpi label="Offen" value={stats.pending} highlight={stats.pending > 0} />
          <Kpi label="Veröffentlicht" value={stats.published} />
          <Kpi label="In Prüfung" value={stats.inProgress} />
          <Kpi label="Umgesetzt" value={stats.done} />
          <Kpi label="Insgesamt" value={stats.total} />
        </div>
      )}

      <Tabs value={tab} onValueChange={v => setTab(v as FeedbackIdeaStatus)}>
        <TabsList>
          <TabsTrigger value="pending_review" className="gap-1.5">
            Offen
            {stats && stats.pending > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{stats.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published">Veröffentlicht</TabsTrigger>
          <TabsTrigger value="in_progress">In Prüfung</TabsTrigger>
          <TabsTrigger value="done">Umgesetzt</TabsTrigger>
          <TabsTrigger value="rejected">Abgelehnt</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            <>
              <ShimmerSkeleton className="h-32 w-full" />
              <ShimmerSkeleton className="h-32 w-full" />
            </>
          ) : ideas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Keine Ideen in diesem Status.
              </CardContent>
            </Card>
          ) : (
            ideas.map(idea => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                responseDraft={responseDraft[idea.id] ?? idea.adminResponse ?? ''}
                onResponseChange={text => setResponseDraft(p => ({ ...p, [idea.id]: text }))}
                onPublish={() => handlePublish(idea)}
                onReject={() => handleReject(idea)}
                onMove={(s, r) => handleMoveStatus(idea, s, r)}
                onSaveResponse={() => handleSaveResponse(idea)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10' : ''}>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function IdeaRow({
  idea,
  responseDraft,
  onResponseChange,
  onPublish,
  onReject,
  onMove,
  onSaveResponse,
}: {
  idea: FeedbackIdea;
  responseDraft: string;
  onResponseChange: (s: string) => void;
  onPublish: () => void;
  onReject: () => void;
  onMove: (s: FeedbackIdeaStatus, r?: FeedbackIdeaRoadmapStatus) => void;
  onSaveResponse: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border w-12 h-12 flex flex-col items-center justify-center shrink-0">
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold tabular-nums">{idea.upvoteCount}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {CAT_LABELS[idea.category]}
              </Badge>
              <Badge variant="outline" className="text-[10px] bg-muted">
                {AREA_LABELS[idea.area]}
              </Badge>
              {idea.rating != null && idea.rating > 0 && (
                <StarRating value={idea.rating} size="sm" />
              )}
            </div>
            <h3 className="font-semibold text-sm sm:text-base break-words">{idea.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed break-words">
              {idea.body}
            </p>
            <div className="text-xs text-muted-foreground pt-1">
              {idea.submitterDisplayName} ({idea.submitterEmail}) ·{' '}
              {new Date(idea.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Admin Response Editor */}
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <label className="text-xs font-medium text-muted-foreground">
            Antwort vom Team (öffentlich auf dem Board sichtbar):
          </label>
          <Textarea
            value={responseDraft}
            onChange={e => onResponseChange(e.target.value)}
            placeholder="Optional: kurze Antwort, die mit der Idee veröffentlicht wird"
            rows={2}
            className="text-sm"
          />
          {responseDraft !== (idea.adminResponse || '') && (
            <Button size="sm" variant="ghost" onClick={onSaveResponse} className="h-7 text-xs gap-1">
              <Send className="h-3 w-3" />
              Antwort speichern
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {idea.status === 'pending_review' && (
            <>
              <Button size="sm" onClick={onPublish} className="gap-1">
                <Check className="h-3.5 w-3.5" />
                Veröffentlichen
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} className="gap-1">
                <X className="h-3.5 w-3.5" />
                Ablehnen
              </Button>
            </>
          )}
          {idea.status === 'published' && (
            <>
              <Button size="sm" variant="outline" onClick={() => onMove('in_progress', 'in_progress')} className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                In Prüfung verschieben
              </Button>
              <Button size="sm" variant="outline" onClick={() => onMove('done', 'shipped')} className="gap-1">
                <Check className="h-3.5 w-3.5" />
                Als umgesetzt markieren
              </Button>
            </>
          )}
          {idea.status === 'in_progress' && (
            <Button size="sm" onClick={() => onMove('done', 'shipped')} className="gap-1">
              <Check className="h-3.5 w-3.5" />
              Als umgesetzt markieren
            </Button>
          )}
          {idea.status === 'rejected' && (
            <Button size="sm" variant="outline" onClick={onPublish} className="gap-1">
              Doch veröffentlichen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const CAT_LABELS: Record<string, string> = {
  improvement: 'Verbesserung',
  new_idea: 'Neue Idee',
  bug: 'Fehler',
  praise: 'Lob',
  other: 'Sonstiges',
};

const AREA_LABELS: Record<string, string> = {
  app_portal: 'App & Portal',
  products: 'Produkte',
  general: 'Allgemein',
};

// helper to keep imports tidy
void cn;
