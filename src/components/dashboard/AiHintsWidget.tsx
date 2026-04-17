import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  AlertTriangle,
  ChevronRight,
  CheckCheck,
  FileText,
  Eye,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { toast } from 'sonner';
import {
  getDocumentsWithHints,
  acknowledgeDocumentHint,
  getDocumentDownloadUrl,
  type Document,
} from '@/services/supabase';
import { AiHintsList } from '@/components/documents/AiHintsList';
import type { DocumentHint } from '@/services/openrouter/document-classification-prompts';
import { cn } from '@/lib/utils';

const DANGER_TYPES = new Set([
  'already_expired',
  'svhc_detected',
  'hazardous_substances',
  'missing_required_info',
]);

interface DocWithHints {
  doc: Document;
  hints: DocumentHint[];
}

interface AiHintsWidgetProps {
  className?: string;
  maxPreview?: number;
}

export function AiHintsWidget({ className, maxPreview = 5 }: AiHintsWidgetProps) {
  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const [items, setItems] = useState<DocWithHints[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set());
  const [detailDoc, setDetailDoc] = useState<DocWithHints | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const docs = await getDocumentsWithHints(true);
    const mapped: DocWithHints[] = docs.map((d) => ({
      doc: d,
      hints: (d.hints || []) as DocumentHint[],
    }));
    // Sort: danger first, then amount of hints, then newest
    mapped.sort((a, b) => {
      const aHasDanger = a.hints.some((h) => DANGER_TYPES.has(h.type));
      const bHasDanger = b.hints.some((h) => DANGER_TYPES.has(h.type));
      if (aHasDanger !== bHasDanger) return bHasDanger ? 1 : -1;
      if (a.hints.length !== b.hints.length) return b.hints.length - a.hints.length;
      return (b.doc.uploadedAt || '').localeCompare(a.doc.uploadedAt || '');
    });
    setItems(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAcknowledge(docId: string, hintId: string | null) {
    const key = `${docId}:${hintId ?? 'all'}`;
    setAcknowledging((prev) => new Set(prev).add(key));
    const result = await acknowledgeDocumentHint(docId, hintId);
    setAcknowledging((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    if (!result.success) {
      toast.error(result.error || 'Failed to acknowledge');
      return;
    }
    toast.success(hintId === null ? t('All hints acknowledged') : t('Hint acknowledged'));
    load();
    // Close detail dialog if acknowledging all and it matches current
    if (hintId === null && detailDoc?.doc.id === docId) {
      setDetailDoc(null);
    }
  }

  async function handleOpenFile(doc: Document) {
    if (!doc.storagePath) {
      toast.error(t('File path missing'));
      return;
    }
    const url = await getDocumentDownloadUrl(doc.storagePath);
    if (!url) {
      toast.error(t('Failed to open file'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleCopyHints(hints: DocumentHint[]) {
    const text = hints.map((h) => `• ${h.message}`).join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success(t('Hints copied')),
      () => toast.error(t('Failed to copy'))
    );
  }

  const totalHints = items.reduce((sum, it) => sum + it.hints.length, 0);
  const dangerCount = items.reduce(
    (sum, it) => sum + it.hints.filter((h) => DANGER_TYPES.has(h.type)).length,
    0
  );
  const warningCount = totalHints - dangerCount;
  const preview = items.slice(0, maxPreview);
  const extraCount = items.length - preview.length;

  if (loading) {
    return (
      <GlassCard className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-muted-foreground animate-pulse" />
            {t('AI hints')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-16 rounded-md bg-muted animate-pulse" />
            <div className="h-16 rounded-md bg-muted animate-pulse" />
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  if (items.length === 0) {
    return (
      <GlassCard className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-muted-foreground" />
            {t('AI hints')}
          </CardTitle>
          <CardDescription>{t('Warnings and recommendations from AI classification.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <CheckCheck className="mx-auto size-10 text-green-500/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t('No open AI hints. All clear.')}
            </p>
          </div>
        </CardContent>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              {t('AI hints')}
              <Badge variant="secondary" className="ml-1">
                {totalHints}
              </Badge>
            </CardTitle>
            <CardDescription>
              {dangerCount > 0 && (
                <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-300 font-medium">
                  <AlertTriangle className="size-3" />
                  {t('{{n}} critical', { n: dangerCount })}
                </span>
              )}
              {dangerCount > 0 && warningCount > 0 && <span className="mx-2">·</span>}
              {warningCount > 0 && (
                <span>{t('{{n}} warnings', { n: warningCount })}</span>
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/documents">
              {tc('View All')}
              <ChevronRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground italic mb-1">
          {t('Tip: right-click a row for more actions')}
        </p>
        {preview.map(({ doc, hints }) => {
          const allKey = `${doc.id}:all`;
          const hasDanger = hints.some((h) => DANGER_TYPES.has(h.type));
          return (
            <ContextMenu key={doc.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-md border bg-card/50 px-2.5 py-2 transition-colors hover:bg-card cursor-context-menu',
                    hasDanger && 'border-red-200 dark:border-red-900/50'
                  )}
                >
                  <FileText className="size-3.5 text-muted-foreground flex-shrink-0" />
                  <button
                    type="button"
                    className="text-xs font-medium truncate flex-1 min-w-0 text-left hover:underline"
                    title={doc.name}
                    onClick={() => setDetailDoc({ doc, hints })}
                  >
                    {doc.name}
                  </button>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] flex-shrink-0 tabular-nums h-5',
                      hasDanger
                        ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    )}
                  >
                    <AlertTriangle className="size-2.5 mr-0.5" />
                    {hints.length}
                  </Badge>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 flex-shrink-0"
                        title={t('Show hints')}
                        aria-label={t('Show hints')}
                      >
                        <Eye className="size-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="end">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Sparkles className="size-3 text-primary" />
                          <span className="truncate">{doc.name}</span>
                        </div>
                        <AiHintsList
                          hints={hints}
                          onAcknowledge={(hint) => {
                            if (hint.id) handleAcknowledge(doc.id, hint.id);
                          }}
                        />
                        {hints.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={() => handleAcknowledge(doc.id, null)}
                            disabled={acknowledging.has(allKey)}
                          >
                            <CheckCheck className="size-3 mr-1" />
                            {t('Mark all as acknowledged')}
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 flex-shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40"
                    onClick={() => handleAcknowledge(doc.id, null)}
                    disabled={acknowledging.has(allKey)}
                    title={t('Acknowledge all hints for this document')}
                    aria-label={t('All OK')}
                  >
                    <CheckCheck className="size-3" />
                  </Button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56">
                <ContextMenuItem onClick={() => setDetailDoc({ doc, hints })}>
                  <Eye className="size-4" />
                  {t('Show details')}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleOpenFile(doc)}>
                  <ExternalLink className="size-4" />
                  {t('Open file')}
                </ContextMenuItem>
                <ContextMenuItem asChild>
                  <Link to="/documents">
                    <FileText className="size-4" />
                    {t('Go to document')}
                  </Link>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handleCopyHints(hints)}>
                  <Copy className="size-4" />
                  {t('Copy hints to clipboard')}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handleAcknowledge(doc.id, null)}>
                  <CheckCheck className="size-4" />
                  {t('Mark all as acknowledged')}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        {extraCount > 0 && (
          <Button variant="outline" size="sm" asChild className="w-full mt-2">
            <Link to="/documents">
              {t('Show {{n}} more documents', { n: extraCount })}
              <ChevronRight className="ml-1 size-3" />
            </Link>
          </Button>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!detailDoc} onOpenChange={(open) => !open && setDetailDoc(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary flex-shrink-0" />
                  <span className="truncate">{detailDoc.doc.name}</span>
                </DialogTitle>
                <DialogDescription>
                  {detailDoc.doc.category}
                  {typeof detailDoc.doc.aiConfidence === 'number' && (
                    <span className="ml-2 text-[10px] tabular-nums">
                      · {t('Confidence')}: {Math.round(detailDoc.doc.aiConfidence * 100)}%
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {detailDoc.doc.description && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  {detailDoc.doc.description}
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('Open hints')} ({detailDoc.hints.length})
                </h4>
                <AiHintsList
                  hints={detailDoc.hints}
                  onAcknowledge={(hint) => {
                    if (hint.id) handleAcknowledge(detailDoc.doc.id, hint.id);
                  }}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenFile(detailDoc.doc)}
                >
                  <ExternalLink className="size-3.5 mr-1" />
                  {t('Open file')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyHints(detailDoc.hints)}
                >
                  <Copy className="size-3.5 mr-1" />
                  {tc('Copy')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAcknowledge(detailDoc.doc.id, null)}
                >
                  <Check className="size-3.5 mr-1" />
                  {t('Mark all as acknowledged')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
