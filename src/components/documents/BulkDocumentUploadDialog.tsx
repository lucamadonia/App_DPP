import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Upload,
  Loader2,
  Sparkles,
  X,
  FileText,
  FileImage,
  Check,
  AlertCircle,
  ChevronRight,
  CloudUpload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { classifyDocument } from '@/services/ai/classify-document';
import { uploadDocument } from '@/services/supabase/documents';
import { useBilling } from '@/hooks/use-billing';
import { AI_CREDIT_COSTS } from '@/types/billing';
import { AiSuggestionBadge } from './AiSuggestionBadge';
import { AiHintsList } from './AiHintsList';
import { DOCUMENT_CATEGORIES, type DocumentCategory } from '@/lib/document-categories';
import type { DocumentClassificationResult } from '@/services/openrouter/document-classification-prompts';
import type { PrematchProduct } from '@/lib/product-prematch';

const MAX_FILES = 20;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.md';
const PARALLEL_LIMIT = 3;

type RowStatus =
  | 'pending'
  | 'classifying'
  | 'classified'
  | 'classify_failed'
  | 'saving'
  | 'saved'
  | 'save_failed'
  | 'skipped';

interface Row {
  id: string;
  file: File;
  status: RowStatus;
  error?: string;
  result?: DocumentClassificationResult;
  // Editable overrides (start as AI suggestions)
  name: string;
  category: DocumentCategory;
  productId: string | null;
  include: boolean;
}

type Step = 'select' | 'review' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: PrematchProduct[];
  productOptions: Array<{ id: string; name: string }>;
  onFilesSaved: () => void;
}

export function BulkDocumentUploadDialog({
  open,
  onOpenChange,
  products,
  productOptions,
  onFilesSaved,
}: Props) {
  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const billing = useBilling();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select');
  const [rows, setRows] = useState<Row[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [savedCount, setSavedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const estimatedCredits = useMemo(() => {
    return rows.reduce((sum, r) => {
      const isVision =
        r.file.type.startsWith('image/') || r.file.type === 'application/pdf';
      return sum + (isVision
        ? AI_CREDIT_COSTS.document_classify_vision
        : AI_CREDIT_COSTS.document_classify_text);
    }, 0);
  }, [rows]);

  const availableCredits =
    (billing.entitlements?.credits.monthlyAllowance ?? 0) -
    (billing.entitlements?.credits.monthlyUsed ?? 0) +
    (billing.entitlements?.credits.purchasedBalance ?? 0);

  const hasEnoughCredits = availableCredits >= estimatedCredits;

  function reset() {
    setStep('select');
    setRows([]);
    setIsProcessing(false);
    setIsSaving(false);
    setProgress({ done: 0, total: 0 });
    setSavedCount(0);
    setFailedCount(0);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleFilesAdded(filesList: FileList | File[]) {
    const files = Array.from(filesList);
    const valid: File[] = [];
    const invalid: string[] = [];

    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        invalid.push(`${f.name}: ${t('File too large (max 10 MB)')}`);
        continue;
      }
      valid.push(f);
    }

    if (invalid.length > 0) {
      toast.error(invalid.join('\n'));
    }

    setRows((prev) => {
      const combined = [...prev, ...valid.map((f) => createRow(f))];
      if (combined.length > MAX_FILES) {
        toast.warning(t('Max {{n}} files at once. Extra files were dropped.', { n: MAX_FILES }));
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Phase 1: classify all files in parallel (with concurrency limit)
  async function startClassification() {
    if (rows.length === 0) return;
    if (!hasEnoughCredits) {
      toast.error(
        t('Not enough AI credits: {{avail}} available, {{need}} required', {
          avail: availableCredits,
          need: estimatedCredits,
        })
      );
      return;
    }

    setStep('review');
    setIsProcessing(true);
    setProgress({ done: 0, total: rows.length });

    const queue = [...rows];
    let doneCount = 0;

    async function worker() {
      while (queue.length > 0) {
        const row = queue.shift();
        if (!row) break;
        updateRow(row.id, { status: 'classifying' });

        const outcome = await classifyDocument({
          file: row.file,
          products,
        });

        if (!outcome.ok) {
          updateRow(row.id, {
            status: 'classify_failed',
            error: outcome.error,
          });
        } else {
          updateRow(row.id, {
            status: 'classified',
            result: outcome.result,
            name: outcome.result.name || row.file.name,
            category: outcome.result.category,
            productId:
              outcome.result.suggestedProductId &&
              productOptions.some((p) => p.id === outcome.result.suggestedProductId)
                ? outcome.result.suggestedProductId
                : null,
          });
        }

        doneCount++;
        setProgress({ done: doneCount, total: rows.length });
      }
    }

    const workers = Array.from({ length: Math.min(PARALLEL_LIMIT, rows.length) }, worker);
    await Promise.all(workers);
    setIsProcessing(false);
    // Refresh credits after all classifications
    billing.refreshEntitlements?.();
  }

  // Phase 2: save all included, classified rows
  async function saveAll() {
    setIsSaving(true);
    let saved = 0;
    let failed = 0;

    for (const row of rows) {
      if (!row.include || row.status === 'saved' || row.status === 'classify_failed') {
        continue;
      }
      updateRow(row.id, { status: 'saving' });

      const result = await uploadDocument(row.file, {
        name: row.name,
        category: row.category,
        visibility: row.result?.visibility || 'internal',
        validUntil: row.result?.validUntil || undefined,
        productId: row.productId || undefined,
        description: row.result?.description,
        hints: row.result?.hints,
        aiClassification: row.result as unknown as Record<string, unknown> | undefined,
        aiConfidence: row.result?.confidence.overall,
        aiModel: row.result ? 'anthropic/claude-sonnet-4' : undefined,
      });

      if (result.success) {
        updateRow(row.id, { status: 'saved' });
        saved++;
      } else {
        updateRow(row.id, { status: 'save_failed', error: result.error });
        failed++;
      }
    }

    setSavedCount(saved);
    setFailedCount(failed);
    setIsSaving(false);
    setStep('done');
    if (saved > 0) {
      onFilesSaved();
      toast.success(t('{{n}} documents uploaded', { n: saved }));
    }
    if (failed > 0) {
      toast.error(t('{{n}} documents failed to save', { n: failed }));
    }
  }

  function handleApplyAllHighConfidence() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        include: r.result ? r.result.confidence.overall >= 0.8 : r.include,
      }))
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleClose() : onOpenChange(o))}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[calc(100vw-2rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t('Bulk Upload (AI-assisted)')}
          </DialogTitle>
          <DialogDescription>
            {t('Upload multiple documents. AI classifies each one. Review and save.')}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn('font-medium', step === 'select' && 'text-foreground')}>
            1. {t('Select')}
          </span>
          <ChevronRight className="size-3" />
          <span className={cn('font-medium', step === 'review' && 'text-foreground')}>
            2. {t('Review')}
          </span>
          <ChevronRight className="size-3" />
          <span className={cn('font-medium', step === 'done' && 'text-foreground')}>
            3. {t('Done')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {step === 'select' && (
            <SelectStep
              rows={rows}
              onFilesAdded={handleFilesAdded}
              onDrop={handleDrop}
              onRemove={removeRow}
              fileInputRef={fileInputRef}
              estimatedCredits={estimatedCredits}
              availableCredits={availableCredits}
              hasEnoughCredits={hasEnoughCredits}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              rows={rows}
              isProcessing={isProcessing}
              progress={progress}
              productOptions={productOptions}
              onUpdate={updateRow}
              onRemove={removeRow}
              onApplyAllHighConfidence={handleApplyAllHighConfidence}
            />
          )}

          {step === 'done' && (
            <DoneStep savedCount={savedCount} failedCount={failedCount} rows={rows} />
          )}
        </div>

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {tc('Cancel')}
              </Button>
              <Button
                onClick={startClassification}
                disabled={rows.length === 0 || !hasEnoughCredits}
              >
                <Sparkles className="size-4 mr-1.5" />
                {t('Classify {{n}} files', { n: rows.length })}
              </Button>
            </>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')} disabled={isProcessing || isSaving}>
                {tc('Back')}
              </Button>
              <Button
                onClick={saveAll}
                disabled={isProcessing || isSaving || rows.every((r) => !r.include)}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    {t('Saving...')}
                  </>
                ) : (
                  <>
                    <Upload className="size-4 mr-1.5" />
                    {t('Save {{n}} documents', { n: rows.filter((r) => r.include).length })}
                  </>
                )}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>
              {tc('Close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// STEP COMPONENTS
// ============================================

function SelectStep({
  rows,
  onFilesAdded,
  onDrop,
  onRemove,
  fileInputRef,
  estimatedCredits,
  availableCredits,
  hasEnoughCredits,
}: {
  rows: Row[];
  onFilesAdded: (files: FileList | File[]) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  estimatedCredits: number;
  availableCredits: number;
  hasEnoughCredits: boolean;
}) {
  const { t } = useTranslation('documents');

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer py-10 px-6 text-center"
      >
        <CloudUpload className="size-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">{t('Drop files here or click to browse')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('PDF, images, text — max {{max}} MB per file, up to {{count}} files', {
            max: 10,
            count: MAX_FILES,
          })}
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && onFilesAdded(e.target.files)}
        />
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {t('Selected: {{n}} files', { n: rows.length })}
            </span>
            <span className={cn('font-medium tabular-nums', !hasEnoughCredits && 'text-destructive')}>
              {t('Estimated: {{n}} credits', { n: estimatedCredits })}
              <span className="text-muted-foreground ml-1">
                ({t('{{n}} available', { n: availableCredits })})
              </span>
            </span>
          </div>

          {!hasEnoughCredits && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs px-3 py-2">
              {t('Not enough AI credits. Please purchase more or remove files.')}
            </div>
          )}

          <ul className="space-y-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                {r.file.type.startsWith('image/') ? (
                  <FileImage className="size-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <FileText className="size-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-1 truncate" title={r.file.name}>{r.file.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {(r.file.size / 1024).toFixed(0)} KB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 flex-shrink-0"
                  onClick={() => onRemove(r.id)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ReviewStep({
  rows,
  isProcessing,
  progress,
  productOptions,
  onUpdate,
  onRemove,
  onApplyAllHighConfidence,
}: {
  rows: Row[];
  isProcessing: boolean;
  progress: { done: number; total: number };
  productOptions: Array<{ id: string; name: string }>;
  onUpdate: (id: string, patch: Partial<Row>) => void;
  onRemove: (id: string) => void;
  onApplyAllHighConfidence: () => void;
}) {
  const { t } = useTranslation('documents');

  return (
    <div className="space-y-3">
      {isProcessing && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {t('Classifying... {{done}} / {{total}}', progress)}
            </span>
            <span className="text-muted-foreground">
              {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
            </span>
          </div>
          <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
        </div>
      )}

      {!isProcessing && rows.some((r) => r.result && r.result.confidence.overall >= 0.8) && (
        <Button variant="outline" size="sm" onClick={onApplyAllHighConfidence}>
          <Check className="size-3.5 mr-1.5" />
          {t('Apply all with confidence ≥ 80%')}
        </Button>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <RowCard
            key={r.id}
            row={r}
            productOptions={productOptions}
            onUpdate={(patch) => onUpdate(r.id, patch)}
            onRemove={() => onRemove(r.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RowCard({
  row,
  productOptions,
  onUpdate,
  onRemove,
}: {
  row: Row;
  productOptions: Array<{ id: string; name: string }>;
  onUpdate: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('documents');
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    pending: 'bg-muted',
    classifying: 'bg-blue-100 text-blue-700',
    classified: 'bg-green-100 text-green-700',
    classify_failed: 'bg-red-100 text-red-700',
    saving: 'bg-blue-100 text-blue-700',
    saved: 'bg-green-100 text-green-700',
    save_failed: 'bg-red-100 text-red-700',
    skipped: 'bg-muted',
  }[row.status];

  return (
    <div
      className={cn(
        'rounded-md border bg-card p-3 transition-colors',
        !row.include && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.include}
          onChange={(e) => onUpdate({ include: e.target.checked })}
          className="mt-1"
          disabled={row.status === 'classify_failed'}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {row.file.type.startsWith('image/') ? (
              <FileImage className="size-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <FileText className="size-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="font-medium text-sm truncate" title={row.file.name}>{row.file.name}</span>
            <Badge className={cn('text-[10px]', statusColor)}>{row.status}</Badge>
            {row.result && (
              <AiSuggestionBadge confidence={row.result.confidence.overall} />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 ml-auto flex-shrink-0"
              onClick={onRemove}
            >
              <X className="size-3" />
            </Button>
          </div>

          {row.status === 'classify_failed' && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-3" />
              {row.error}
            </div>
          )}

          {row.result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs">{t('Title')}</Label>
                <Input
                  value={row.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  className="h-8 text-xs w-full"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs">{t('Category')}</Label>
                <Select
                  value={row.category}
                  onValueChange={(v) => onUpdate({ category: v as DocumentCategory })}
                >
                  <SelectTrigger className="h-8 text-xs w-full [&>span]:truncate [&>span]:text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs">{t('Product')}</Label>
                <Select
                  value={row.productId || '__none'}
                  onValueChange={(v) => onUpdate({ productId: v === '__none' ? null : v })}
                >
                  <SelectTrigger className="h-8 text-xs w-full [&>span]:truncate [&>span]:text-left">
                    <SelectValue placeholder={t('None')} />
                  </SelectTrigger>
                  <SelectContent className="max-w-[min(90vw,480px)]">
                    <SelectItem value="__none">{t('None')}</SelectItem>
                    {productOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {row.result && row.result.hints.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="h-6 text-xs"
              >
                {expanded
                  ? t('Hide {{n}} hints', { n: row.result.hints.length })
                  : t('Show {{n}} hints', { n: row.result.hints.length })}
              </Button>
              {expanded && <AiHintsList hints={row.result.hints} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DoneStep({
  savedCount,
  failedCount,
  rows,
}: {
  savedCount: number;
  failedCount: number;
  rows: Row[];
}) {
  const { t } = useTranslation('documents');
  const failed = rows.filter((r) => r.status === 'save_failed' || r.status === 'classify_failed');

  return (
    <div className="space-y-4 text-center py-6">
      <div className="mx-auto size-12 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
        <Check className="size-6 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p className="text-lg font-semibold">
          {t('{{n}} documents uploaded', { n: savedCount })}
        </p>
        {failedCount > 0 && (
          <p className="text-sm text-destructive mt-1">
            {t('{{n}} failed', { n: failedCount })}
          </p>
        )}
      </div>
      {failed.length > 0 && (
        <div className="text-left space-y-1 max-w-md mx-auto">
          {failed.map((r) => (
            <div key={r.id} className="text-xs flex items-start gap-2">
              <AlertCircle className="size-3 text-destructive flex-shrink-0 mt-0.5" />
              <span className="flex-1">
                <span className="font-medium">{r.file.name}:</span> {r.error}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function createRow(file: File): Row {
  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    status: 'pending',
    name: file.name,
    category: 'Other' as DocumentCategory,
    productId: null,
    include: true,
  };
}
