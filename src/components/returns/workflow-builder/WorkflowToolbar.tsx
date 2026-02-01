import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ZoomIn, ZoomOut, Maximize2,
  LayoutGrid, Save, Download, Upload, AlertTriangle,
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

  return (
    <div className="h-12 border-b bg-card flex items-center gap-2 px-3 shrink-0">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
        <ArrowLeft size={16} />
      </Button>

      {/* Workflow name */}
      <Input
        className="h-7 w-48 text-sm font-medium border-transparent hover:border-input focus:border-input"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />

      {/* Status badges */}
      <Badge variant={active ? 'default' : 'secondary'} className="text-[10px] h-5">
        {active ? t('Active') : t('Inactive')}
      </Badge>
      {isDirty && (
        <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300">
          {t('Unsaved')}
        </Badge>
      )}
      {validationErrorCount > 0 && (
        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
          <AlertTriangle size={10} />
          {validationErrorCount} {validationErrorCount === 1 ? t('Error') : t('Errors')}
        </Badge>
      )}

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 border rounded-md">
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
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onAutoLayout}>
        <LayoutGrid size={12} /> {t('Auto-Layout')}
      </Button>

      {/* Import/Export dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Download size={12} /> JSON
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
      <Button size="sm" className="h-7 text-xs gap-1" onClick={onSave} disabled={saving || !isDirty}>
        <Save size={12} /> {saving ? t('Saving...') : t('Save')}
      </Button>
    </div>
  );
}
