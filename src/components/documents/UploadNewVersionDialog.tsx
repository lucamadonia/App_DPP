import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import { uploadDocumentVersion, type Document } from '@/services/supabase';

interface UploadNewVersionDialogProps {
  doc: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

export function UploadNewVersionDialog({
  doc,
  open,
  onOpenChange,
  onUploaded,
}: UploadNewVersionDialogProps) {
  const { t } = useTranslation('documents');
  const [file, setFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setChangeNote('');
      setIsUploading(false);
    }
  }, [open]);

  async function handleSubmit() {
    if (!doc || !file) return;
    setIsUploading(true);
    const result = await uploadDocumentVersion(doc.id, file, {
      changeNote: changeNote || undefined,
    });
    setIsUploading(false);

    if (!result.success) {
      toast.error(result.error || t('Failed to upload new version'));
      return;
    }
    toast.success(t('Version uploaded successfully'));
    onUploaded();
    onOpenChange(false);
  }

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Upload New Version')}</DialogTitle>
          <DialogDescription>{doc.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="version-file">{t('File')}</Label>
            <Input
              id="version-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-note">{t('Change Note (optional)')}</Label>
            <Textarea
              id="change-note"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder={t('What changed in this version?')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isUploading}>
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isUploading ? t('Uploading...', { ns: 'common' }) : t('Upload New Version')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
