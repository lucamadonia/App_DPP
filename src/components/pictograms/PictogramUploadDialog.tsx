import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileImage, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions } from '@/components/ui/form-layout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/adaptive-dialog';
import { uploadTenantPictogram } from '@/services/supabase/tenant-pictograms';
import { cn } from '@/lib/utils';
import { checkerboard, formatBytes, parseTags, validatePictogramFile } from './pictogram-config';
import { PictogramFormFields, type PictogramFormValues } from './PictogramFormFields';

interface PictogramUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A file dropped onto the page before the dialog opened. */
  initialFile?: File | null;
  onUploaded: () => void;
}

function readAsDataUrl(file: File, done: (url: string) => void) {
  const reader = new FileReader();
  reader.onload = () => done(reader.result as string);
  reader.readAsDataURL(file);
}

const EMPTY: PictogramFormValues = { name: '', description: '', category: 'custom', regulationYear: '', tags: '' };

/** Mount with a fresh `key` per opening so the form starts clean. */
export function PictogramUploadDialog({ open, onOpenChange, initialFile = null, onUploaded }: PictogramUploadDialogProps) {
  const { t } = useTranslation('products');
  const [file, setFile] = useState<File | null>(initialFile);
  const [values, setValues] = useState<PictogramFormValues>(() => ({
    ...EMPTY,
    name: initialFile ? initialFile.name.replace(/\.[^.]+$/, '') : '',
  }));
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (initialFile) readAsDataUrl(initialFile, setPreview);
  }, [initialFile]);

  const acceptFile = (next: File | undefined) => {
    if (!next) return;
    const problem = validatePictogramFile(next);
    if (problem === 'format') {
      toast.error(t('pictograms.upload.invalidFormat', 'Unsupported format. Use SVG, PNG, or JPG.'));
      return;
    }
    if (problem === 'size') {
      toast.error(t('pictograms.upload.tooLarge', 'File too large. Max 5 MB per file.'));
      return;
    }
    setFile(next);
    readAsDataUrl(next, setPreview);
    setValues((v) => ({ ...v, name: v.name || next.name.replace(/\.[^.]+$/, '') }));
  };

  const clearFile = () => {
    setFile(null);
    setPreview('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || !values.name.trim()) return;
    try {
      setIsUploading(true);
      await uploadTenantPictogram(file, {
        name: values.name.trim(),
        description: values.description.trim(),
        category: values.category,
        regulationYear: values.regulationYear.trim(),
        tags: parseTags(values.tags),
      });
      toast.success(t('pictograms.upload.success', 'Pictogram uploaded successfully'));
      onOpenChange(false);
      onUploaded();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const hint = `${t('pictograms.upload.formats', 'SVG, PNG, JPG')} · ${t('pictograms.upload.maxSize', 'Max 5 MB per file')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto pb-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('pictograms.upload', 'Upload Pictogram')}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                acceptFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center',
                'transition-[border-color,background-color] duration-150 ease-out',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
              )}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <Upload className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">{t('pictograms.upload.dropzone', 'Drop file here or click to browse')}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-4 rounded-2xl border bg-muted/30 p-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border bg-card" style={checkerboard(10)}>
                <img src={preview} alt="" className="max-h-16 max-w-16 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{file.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                <Button variant="link" size="sm" className="h-auto min-h-11 px-0 sm:min-h-0" onClick={() => inputRef.current?.click()}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t('Replace file')}
                </Button>
              </div>
              <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0" aria-label={t('Remove', { ns: 'common' })} onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".svg,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          <PictogramFormFields idPrefix="picto-upload" values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
        </div>

        <FormActions sticky="dialog">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleUpload} disabled={!file || !values.name.trim() || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('pictograms.upload', 'Upload Pictogram')}
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  );
}
