import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileImage, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { getDocumentDownloadUrl, type Document } from '@/services/supabase';

interface DocumentPreviewSheetProps {
  doc: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (doc: Document) => void;
}

export function DocumentPreviewSheet({ doc, open, onOpenChange, onDownload }: DocumentPreviewSheetProps) {
  const { t } = useTranslation('documents');
  const locale = useLocale();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const loadUrl = useCallback(async (storagePath: string) => {
    setIsLoadingUrl(true);
    setSignedUrl(null);
    const url = await getDocumentDownloadUrl(storagePath);
    setSignedUrl(url);
    setIsLoadingUrl(false);
  }, []);

  useEffect(() => {
    if (open && doc?.storagePath) {
      loadUrl(doc.storagePath);
    }
    if (!open) {
      setSignedUrl(null);
    }
  }, [open, doc?.storagePath, loadUrl]);

  if (!doc) return null;

  const typeIcon = doc.type === 'pdf'
    ? <FileText className="h-4 w-4 text-red-500" />
    : doc.type === 'image'
      ? <FileImage className="h-4 w-4 text-blue-500" />
      : <File className="h-4 w-4 text-muted-foreground" />;

  const canPreview = (doc.type === 'pdf' || doc.type === 'image') && signedUrl;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center gap-2 pr-8">
            {typeIcon}
            <SheetTitle className="truncate text-base">{doc.name}</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{doc.category}</Badge>
            {doc.size && <span className="text-xs text-muted-foreground">{doc.size}</span>}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-4 py-3">
          {isLoadingUrl && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">{t('Loading preview...')}</span>
              </div>
            </div>
          )}

          {!isLoadingUrl && canPreview && doc.type === 'pdf' && (
            <iframe
              src={signedUrl!}
              className="w-full h-full min-h-[500px] rounded border"
              title={doc.name}
            />
          )}

          {!isLoadingUrl && canPreview && doc.type === 'image' && (
            <div className="flex items-center justify-center">
              <img
                src={signedUrl!}
                alt={doc.name}
                className="max-w-full max-h-[500px] object-contain rounded border"
              />
            </div>
          )}

          {!isLoadingUrl && !canPreview && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <File className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-sm">{t('Preview not available')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {doc.storagePath ? t('Download to view this file') : t('No file attached')}
              </p>
            </div>
          )}

          {/* File Information */}
          <div className="mt-4 space-y-2 text-sm border-t pt-3">
            <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
              {t('File Information')}
            </h4>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <span className="text-muted-foreground">{t('Category')}</span>
              <span>{doc.category}</span>
              <span className="text-muted-foreground">{t('File type')}</span>
              <span className="uppercase">{doc.type}</span>
              <span className="text-muted-foreground">{t('Uploaded')}</span>
              <span>{doc.uploadedAt ? formatDate(doc.uploadedAt, locale) : '-'}</span>
              {doc.validUntil && (
                <>
                  <span className="text-muted-foreground">{t('Valid Until')}</span>
                  <span>{formatDate(doc.validUntil, locale)}</span>
                </>
              )}
              {doc.size && (
                <>
                  <span className="text-muted-foreground">{t('Size')}</span>
                  <span>{doc.size}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t px-4 py-3">
          <Button
            className="w-full"
            onClick={() => onDownload(doc)}
            disabled={!doc.storagePath}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('Download', { ns: 'common' })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
