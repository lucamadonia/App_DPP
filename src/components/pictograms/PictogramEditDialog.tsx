import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormActions } from '@/components/ui/form-layout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/adaptive-dialog';
import { updateTenantPictogram } from '@/services/supabase/tenant-pictograms';
import type { TenantPictogram } from '@/types/database';
import { checkerboard, formatBytes, parseTags } from './pictogram-config';
import { PictogramFormFields, type PictogramFormValues } from './PictogramFormFields';

interface PictogramEditDialogProps {
  /** Mount with `key={pictogram.id}` so the form re-seeds per pictogram. */
  pictogram: TenantPictogram;
  onClose: () => void;
  onSaved: () => void;
}

export function PictogramEditDialog({ pictogram, onClose, onSaved }: PictogramEditDialogProps) {
  const { t } = useTranslation('products');
  const [values, setValues] = useState<PictogramFormValues>({
    name: pictogram.name,
    description: pictogram.description,
    category: pictogram.category,
    regulationYear: pictogram.regulationYear,
    tags: pictogram.tags.join(', '),
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!values.name.trim()) return;
    try {
      setIsSaving(true);
      await updateTenantPictogram(pictogram.id, {
        name: values.name.trim(),
        description: values.description.trim(),
        category: values.category,
        regulationYear: values.regulationYear.trim(),
        tags: parseTags(values.tags),
      });
      toast.success(t('pictograms.edit.success', 'Pictogram updated'));
      onClose();
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto pb-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('pictograms.edit.title', 'Edit Pictogram')}</DialogTitle>
          <DialogDescription className="uppercase tabular-nums">
            {pictogram.fileType} · {formatBytes(pictogram.fileSize)}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          <div className="flex justify-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl border bg-card shadow-sm" style={checkerboard(12)}>
              <img src={pictogram.fileUrl} alt={values.name} className="max-h-20 max-w-20 object-contain" />
            </div>
          </div>
          <PictogramFormFields idPrefix="picto-edit" values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
        </div>

        <FormActions sticky="dialog">
          <Button variant="outline" onClick={onClose}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSave} disabled={!values.name.trim() || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Save', { ns: 'common' })}
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  );
}
