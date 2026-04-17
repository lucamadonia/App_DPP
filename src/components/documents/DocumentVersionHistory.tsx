import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, RotateCcw, Trash2, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getDocumentVersions,
  getDocumentDownloadUrl,
  restoreDocumentVersion,
  deleteDocumentVersion,
  type DocumentVersion,
} from '@/services/supabase';

interface DocumentVersionHistoryProps {
  documentId: string;
  /** Invoked when the current-version pointer moves (new upload or restore). */
  onCurrentChanged?: () => void;
}

export function DocumentVersionHistory({ documentId, onCurrentChanged }: DocumentVersionHistoryProps) {
  const { t } = useTranslation('documents');
  const locale = useLocale();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const rows = await getDocumentVersions(documentId);
    setVersions(rows);
    setIsLoading(false);
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownload(v: DocumentVersion) {
    if (!v.storagePath) {
      toast.error(t('File path missing'));
      return;
    }
    const url = await getDocumentDownloadUrl(v.storagePath);
    if (!url) {
      toast.error(t('Failed to open file'));
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = v.fileName;
    a.click();
  }

  async function handleOpen(v: DocumentVersion) {
    if (!v.storagePath) return;
    const url = await getDocumentDownloadUrl(v.storagePath);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleRestore(v: DocumentVersion) {
    setBusyId(v.id);
    const result = await restoreDocumentVersion(documentId, v.id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error || t('Failed to restore version'));
      return;
    }
    toast.success(t('Version restored'));
    await load();
    onCurrentChanged?.();
  }

  async function handleDelete(v: DocumentVersion) {
    setBusyId(v.id);
    const result = await deleteDocumentVersion(v.id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!result.success) {
      toast.error(result.error || t('Failed to delete version'));
      return;
    }
    toast.success(t('Version deleted'));
    await load();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('Loading...', { ns: 'common' })}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {t('No version history available')}
      </p>
    );
  }

  const currentVersion = versions[0]?.versionNumber;

  return (
    <>
      <ul className="space-y-2">
        {versions.map((v) => {
          const isCurrent = v.versionNumber === currentVersion;
          const isBusy = busyId === v.id;
          return (
            <li
              key={v.id}
              className="flex items-start gap-3 rounded-md border bg-muted/30 p-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {t('v{{n}}', { n: v.versionNumber })}
                  </span>
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4">
                      {t('Current Version')}
                    </Badge>
                  )}
                  {v.size && (
                    <span className="text-xs text-muted-foreground">{v.size}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate" title={v.fileName}>
                  {v.fileName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(v.uploadedAt, locale)}
                </div>
                {v.changeNote && (
                  <div className="text-xs italic text-muted-foreground">
                    "{v.changeNote}"
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={t('Open in new tab')}
                  onClick={() => handleOpen(v)}
                  disabled={!v.storagePath || isBusy}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title={t('Download', { ns: 'common' })}
                  onClick={() => handleDownload(v)}
                  disabled={!v.storagePath || isBusy}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {!isCurrent && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t('Restore This Version')}
                      onClick={() => handleRestore(v)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title={t('Delete Version')}
                      onClick={() => setConfirmDeleteId(v.id)}
                      disabled={isBusy}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Version')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Confirm delete version')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const v = versions.find((x) => x.id === confirmDeleteId);
                if (v) handleDelete(v);
              }}
            >
              {t('Delete', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
