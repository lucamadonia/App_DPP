import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ZoomIn, ZoomOut, Maximize2,
  LayoutGrid, Save, Download, Upload, AlertTriangle, MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WorkflowToolbarProps {
  name: string;
  active: boolean;
  isDirty: boolean;
  saving: boolean;
  zoom: number;
  validationErrorCount?: number;
  onNameChange: (name: string) => void;
  onBack: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAutoLayout: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function WorkflowToolbar({
  name,
  active,
  isDirty,
  saving,
  zoom,
  validationErrorCount = 0,
  onNameChange,
  onBack,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onAutoLayout,
  onSave,
  onExport,
  onImport,
}: WorkflowToolbarProps) {
  const { t } = useTranslation('returns');

  // Phones get the linear rule editor (no canvas editing), so zoom and
  // auto-layout are desktop-only; the remaining controls use 44px targets.
  return (
    <div className="min-h-12 border-b bg-card flex min-w-0 items-center gap-1.5 px-2 py-1 md:h-12 md:gap-2 md:px-3 md:py-0 shrink-0">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="size-11 shrink-0 p-0 md:size-7" onClick={onBack} aria-label={t('Back')}>
        <ArrowLeft size={16} />
      </Button>

      {/* Workflow name */}
      <Input
        className="h-11 min-w-0 flex-1 text-base font-medium border-transparent hover:border-input focus:border-input md:h-7 md:w-48 md:flex-none md:text-sm"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label={t('Name')}
      />

      {/* Status badges */}
      <Badge variant={active ? 'default' : 'secondary'} className="hidden text-[10px] h-5 sm:inline-flex">
        {active ? t('Active') : t('Inactive')}
      </Badge>
      {isDirty && (
        <Badge variant="outline" className="hidden text-[10px] h-5 text-amber-600 border-amber-300 sm:inline-flex">
          {t('Unsaved')}
        </Badge>
      )}
      {validationErrorCount > 0 && (
        <Badge variant="destructive" className="text-[10px] h-5 gap-1 shrink-0">
          <AlertTriangle size={10} />
          {validationErrorCount}
          <span className="hidden sm:inline">{validationErrorCount === 1 ? t('Error') : t('Errors')}</span>
        </Badge>
      )}

      <div className="hidden flex-1 md:block" />

      {/* Zoom controls */}
      <div className="hidden items-center gap-0.5 border rounded-md md:flex">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onZoomOut}>
          <ZoomOut size={14} />
        </Button>
        <span className="text-xs w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onZoomIn}>
          <ZoomIn size={14} />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onZoomReset} title={t('Fit to View')}>
          <Maximize2 size={14} />
        </Button>
      </div>

      {/* Auto-layout */}
      <Button variant="outline" size="sm" className="hidden h-7 text-xs gap-1 md:inline-flex" onClick={onAutoLayout}>
        <LayoutGrid size={12} /> {t('Auto-Layout')}
      </Button>

      {/* Import/Export dropdown (icon-only on phones) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="size-11 shrink-0 p-0 text-xs gap-1 md:h-7 md:w-auto md:px-3" aria-label={t('More actions', { ns: 'common' })}>
            <MoreHorizontal size={16} className="md:hidden" />
            <Download size={12} className="hidden md:block" />
            <span className="hidden md:inline">JSON</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExport}>
            <Download size={12} className="mr-2" /> {t('Export JSON')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onImport}>
            <Upload size={12} className="mr-2" /> {t('Import JSON')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save */}
      <Button size="sm" className="h-11 shrink-0 text-xs gap-1 md:h-7" onClick={onSave} disabled={saving || !isDirty}>
        <Save size={12} /> {saving ? t('Saving...') : t('Save')}
      </Button>
    </div>
  );
}
