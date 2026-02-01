import { useTranslation } from 'react-i18next';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import type { SaveStatus } from './emailEditorTypes';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  const { t } = useTranslation('returns');

  switch (status) {
    case 'saved':
      return (
        <div className="flex items-center gap-1.5 text-xs text-green-600 animate-save-pulse">
          <Check className="h-3.5 w-3.5" />
          <span>{t('Saved')}</span>
        </div>
      );
    case 'saving':
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t('Saving...')}</span>
        </div>
      );
    case 'unsaved':
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>{t('Unsaved changes')}</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{t('Save failed')}</span>
        </div>
      );
  }
}
