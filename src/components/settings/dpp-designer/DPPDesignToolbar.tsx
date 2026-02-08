/**
 * Top toolbar for the DPP Design editor: View toggle, viewport toggle, save button.
 */
import { Save, Check, Loader2, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export type ViewMode = 'consumer' | 'customs';
export type Viewport = 'desktop' | 'tablet' | 'mobile';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  viewport: Viewport;
  onViewportChange: (v: Viewport) => void;
  onSave: () => void;
  isSaving: boolean;
  saved: boolean;
}

export function DPPDesignToolbar({
  viewMode,
  onViewModeChange,
  viewport,
  onViewportChange,
  onSave,
  isSaving,
  saved,
}: Props) {
  const { t } = useTranslation('settings');

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20">
      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
        <button
          onClick={() => onViewModeChange('consumer')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'consumer'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('Consumer')}
        </button>
        <button
          onClick={() => onViewModeChange('customs')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'customs'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('Customs')}
        </button>
      </div>

      {/* Viewport Toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
        {([
          ['desktop', <Monitor key="d" className="h-4 w-4" />],
          ['tablet', <Tablet key="t" className="h-4 w-4" />],
          ['mobile', <Smartphone key="m" className="h-4 w-4" />],
        ] as [Viewport, React.ReactNode][]).map(([v, icon]) => (
          <button
            key={v}
            onClick={() => onViewportChange(v)}
            className={`p-1.5 rounded-md transition-colors ${
              viewport === v
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={t(v.charAt(0).toUpperCase() + v.slice(1))}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Save */}
      <Button onClick={onSave} disabled={isSaving} size="sm">
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4 mr-1.5 text-green-500" />
        ) : (
          <Save className="h-4 w-4 mr-1.5" />
        )}
        {saved ? t('Saved!') : t('Save')}
      </Button>
    </div>
  );
}
