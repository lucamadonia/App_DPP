import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LabelSaveStatus } from '@/types/master-label-editor';
import type { LabelVariant } from '@/types/master-label';
import type { BatchListItem } from '@/types/product';

interface LabelEditorToolbarProps {
  templateName: string;
  variant: LabelVariant;
  onVariantChange: (v: LabelVariant) => void;
  batches: BatchListItem[];
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: LabelSaveStatus;
  onSave: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  isGenerating: boolean;
  onGeneratePDF: () => void;
  onBack: () => void;
}

const ZOOM_LEVELS = [50, 75, 100, 150];

function SaveStatusDot({ status }: { status: LabelSaveStatus }) {
  const colors: Record<LabelSaveStatus, string> = {
    saved: 'bg-green-500',
    unsaved: 'bg-yellow-500',
    saving: 'bg-yellow-500 animate-pulse',
    error: 'bg-red-500',
  };

  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

export function LabelEditorToolbar({
  templateName,
  variant,
  onVariantChange,
  batches,
  selectedBatchId,
  onBatchChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  onSave,
  zoom,
  onZoomChange,
  isGenerating,
  onGeneratePDF,
  onBack,
}: LabelEditorToolbarProps) {
  const { t } = useTranslation('products');
  const liveBatches = batches.filter(b => b.status === 'live' || b.status === 'draft');

  return (
    <div className="h-12 shrink-0 border-b bg-background/80 backdrop-blur-sm flex items-center gap-2 px-3">
      {/* Back */}
      <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Template name */}
      <span className="text-sm font-medium truncate max-w-[160px]">{templateName}</span>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Variant toggle */}
      <Select value={variant} onValueChange={(v) => onVariantChange(v as LabelVariant)}>
        <SelectTrigger className="h-8 w-[100px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="b2b">B2B</SelectItem>
          <SelectItem value="b2c">B2C</SelectItem>
        </SelectContent>
      </Select>

      {/* Batch selector */}
      <Select value={selectedBatchId} onValueChange={onBatchChange}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder={t('ml.selectBatchPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {liveBatches.map((batch) => (
            <SelectItem key={batch.id} value={batch.id}>
              {batch.serialNumber}
              {batch.batchNumber ? ` (${batch.batchNumber})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Undo/Redo */}
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo}>
        <Redo2 className="h-4 w-4" />
      </Button>

      {/* Save status */}
      <div className="flex items-center gap-1.5 ml-1">
        <SaveStatusDot status={saveStatus} />
        <button onClick={onSave} className="text-xs text-muted-foreground hover:text-foreground">
          {saveStatus === 'saving' ? t('ml.editor.saving') : saveStatus === 'saved' ? t('ml.editor.saved') : t('ml.editor.save')}
        </button>
      </div>

      <div className="flex-1" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={zoom <= ZOOM_LEVELS[0]}
          onClick={() => {
            const idx = ZOOM_LEVELS.indexOf(zoom);
            if (idx > 0) onZoomChange(ZOOM_LEVELS[idx - 1]);
          }}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground w-8 text-center">{zoom}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
          onClick={() => {
            const idx = ZOOM_LEVELS.indexOf(zoom);
            if (idx < ZOOM_LEVELS.length - 1) onZoomChange(ZOOM_LEVELS[idx + 1]);
          }}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Generate PDF */}
      <Button onClick={onGeneratePDF} disabled={isGenerating} size="sm" className="h-8">
        {isGenerating ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-3.5 w-3.5" />
        )}
        {t('ml.generatePDF')}
      </Button>
    </div>
  );
}
