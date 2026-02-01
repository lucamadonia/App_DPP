import { useTranslation } from 'react-i18next';
import { ArrowLeft, Undo2, Redo2, Save, Loader2, RotateCcw, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import type { SaveStatus } from './emailEditorTypes';

interface EditorToolbarProps {
  templateName: string;
  locale: string;
  onLocaleChange: (locale: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onReset: () => void;
  onBack: () => void;
  saving: boolean;
  saveStatus: SaveStatus;
  viewportMode: 'desktop' | 'mobile';
  onViewportChange: (mode: 'desktop' | 'mobile') => void;
}

export function EditorToolbar({
  templateName,
  locale,
  onLocaleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onReset,
  onBack,
  saving,
  saveStatus,
  viewportMode,
  onViewportChange,
}: EditorToolbarProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-b border-white/20 shadow-sm sticky top-0 z-20">
      {/* Back button */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Template name */}
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold truncate">{t(templateName)}</h2>
      </div>

      {/* Locale switch */}
      <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md shrink-0">
        <button
          onClick={() => onLocaleChange('en')}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            locale === 'en' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => onLocaleChange('de')}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            locale === 'de' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
          }`}
        >
          DE
        </button>
      </div>

      {/* Viewport toggle */}
      <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md shrink-0">
        <button
          onClick={() => onViewportChange('desktop')}
          className={`p-1 rounded transition-colors ${
            viewportMode === 'desktop' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onViewportChange('mobile')}
          className={`p-1 rounded transition-colors ${
            viewportMode === 'mobile' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border shrink-0" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canUndo} onClick={onUndo} title={t('Undo')}>
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canRedo} onClick={onRedo} title={t('Redo')}>
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Save status */}
      <SaveStatusIndicator status={saveStatus} />

      {/* Reset */}
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={onReset}>
        <RotateCcw className="h-3 w-3" />
        {t('Reset')}
      </Button>

      {/* Save button */}
      <Button size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        {t('Save')}
      </Button>
    </div>
  );
}
