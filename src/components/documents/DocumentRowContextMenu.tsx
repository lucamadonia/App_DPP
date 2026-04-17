import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Download,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
  CheckCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  acknowledgeDocumentHint,
  getDocumentDownloadUrl,
  type Document,
} from '@/services/supabase';
import type { DocumentHint } from '@/services/openrouter/document-classification-prompts';

interface DocumentRowContextMenuProps {
  doc: Document;
  children: React.ReactNode;
  onPreview?: (doc: Document) => void;
  onDownload?: (doc: Document) => void;
  onEdit?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onChanged?: () => void;
}

/**
 * Wrap any row element with right-click context menu for common document actions.
 * Also exposes AI-hint specific actions (acknowledge, copy hints) when hints exist.
 */
export function DocumentRowContextMenu({
  doc,
  children,
  onPreview,
  onDownload,
  onEdit,
  onDelete,
  onChanged,
}: DocumentRowContextMenuProps) {
  const { t } = useTranslation('documents');
  const { t: tc } = useTranslation('common');
  const [isAcking, setIsAcking] = useState(false);

  const openHints = (doc.hints || []).filter((h) => !(h as DocumentHint).acknowledgedAt);
  const hasHints = openHints.length > 0;
  const allHints = doc.hints || [];

  async function handleOpenFile() {
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

  async function handleAcknowledgeAll() {
    if (!hasHints || isAcking) return;
    setIsAcking(true);
    const result = await acknowledgeDocumentHint(doc.id, null);
    setIsAcking(false);
    if (!result.success) {
      toast.error(result.error || 'Failed');
      return;
    }
    toast.success(t('All hints acknowledged'));
    onChanged?.();
  }

  async function handleAcknowledgeHint(hint: DocumentHint) {
    if (!hint.id || isAcking) return;
    setIsAcking(true);
    const result = await acknowledgeDocumentHint(doc.id, hint.id);
    setIsAcking(false);
    if (!result.success) {
      toast.error(result.error || 'Failed');
      return;
    }
    toast.success(t('Hint acknowledged'));
    onChanged?.();
  }

  function handleCopyHints() {
    if (allHints.length === 0) return;
    const text = (allHints as DocumentHint[])
      .map((h) => `• [${h.acknowledgedAt ? '✓ ' : ''}${h.type}] ${h.message}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => toast.success(t('Hints copied')),
      () => toast.error(t('Failed to copy'))
    );
  }

  function handleCopyInfo() {
    const lines = [
      `${doc.name}`,
      doc.description ? `\n${doc.description}` : '',
      `\nCategory: ${doc.category}`,
      doc.validUntil ? `Valid until: ${doc.validUntil}` : '',
      doc.aiConfidence != null ? `AI confidence: ${Math.round(doc.aiConfidence * 100)}%` : '',
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(lines).then(
      () => toast.success(t('Document info copied')),
      () => toast.error(t('Failed to copy'))
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        {onPreview && (
          <ContextMenuItem onClick={() => onPreview(doc)}>
            <Eye className="size-4" />
            {t('Preview')}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleOpenFile} disabled={!doc.storagePath}>
          <ExternalLink className="size-4" />
          {t('Open in new tab')}
        </ContextMenuItem>
        {onDownload && (
          <ContextMenuItem onClick={() => onDownload(doc)} disabled={!doc.storagePath}>
            <Download className="size-4" />
            {tc('Download')}
          </ContextMenuItem>
        )}
        {onEdit && (
          <ContextMenuItem onClick={() => onEdit(doc)}>
            <Pencil className="size-4" />
            {t('Edit Details')}
          </ContextMenuItem>
        )}

        {hasHints && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Sparkles className="size-4" />
                {t('AI hints')} ({openHints.length})
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-72">
                {(openHints as DocumentHint[]).slice(0, 8).map((hint, idx) => (
                  <ContextMenuItem
                    key={hint.id ?? `${hint.type}-${idx}`}
                    onClick={() => handleAcknowledgeHint(hint)}
                    className="whitespace-normal items-start"
                  >
                    <CheckCheck className="size-4 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-snug">{hint.message}</span>
                  </ContextMenuItem>
                ))}
                {openHints.length > 1 && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={handleAcknowledgeAll}>
                      <CheckCheck className="size-4" />
                      {t('Mark all as acknowledged')}
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onClick={handleCopyHints}>
              <Copy className="size-4" />
              {t('Copy hints to clipboard')}
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopyInfo}>
          <Info className="size-4" />
          {t('Copy document info')}
        </ContextMenuItem>

        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => onDelete(doc)}>
              <Trash2 className="size-4" />
              {tc('Delete')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
