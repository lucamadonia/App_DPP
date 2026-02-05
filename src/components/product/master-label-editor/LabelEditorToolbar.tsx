import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
  Save,
  Copy,
  Factory,
  Building2,
  Package,
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
import type { SupplierProduct } from '@/types/database';

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
  onSaveAs: () => void;
  isBuiltinTemplate: boolean;
  zoom: number;
  onZoomChange: (z: number) => void;
  isGenerating: boolean;
  onGeneratePDF: () => void;
  onOpenMultiLabelDialog: () => void;
  onBack: () => void;
  productSuppliers?: Array<SupplierProduct & { supplier_name: string; supplier_country: string }>;
  manufacturerOverrideId: string | null;
  onManufacturerOverride: (id: string | null) => void;
  importerOverrideId: string | null;
  onImporterOverride: (id: string | null) => void;
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
  onSaveAs,
  isBuiltinTemplate,
  zoom,
  onZoomChange,
  isGenerating,
  onGeneratePDF,
  onOpenMultiLabelDialog,
  onBack,
  productSuppliers = [],
  manufacturerOverrideId,
  onManufacturerOverride,
  importerOverrideId,
  onImporterOverride,
}: LabelEditorToolbarProps) {
  const { t } = useTranslation('products');
  const liveBatches = batches.filter(b => b.status === 'live' || b.status === 'draft');

  const manufacturerSuppliers = productSuppliers.filter(sp => sp.role === 'manufacturer');
  const importerSuppliers = productSuppliers.filter(sp => sp.role === 'importeur');

  return (
    <div className="h-12 shrink-0 border-b bg-background/80 backdrop-blur-sm flex items-center gap-2 px-3">
      {/* Back */}
      <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Template name + save status dot */}
      <div className="flex items-center gap-1.5">
        <SaveStatusDot status={saveStatus} />
        <span className="text-sm font-medium truncate max-w-[140px]">{templateName}</span>
      </div>

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

      {/* Manufacturer override */}
      {manufacturerSuppliers.length > 0 && (
        <Select
          value={manufacturerOverrideId || '_default'}
          onValueChange={(v) => onManufacturerOverride(v === '_default' ? null : v)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <div className="flex items-center gap-1 truncate">
              <Factory className="h-3 w-3 shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_default">{t('ml.editor.fromProduct')}</SelectItem>
            {manufacturerSuppliers.map((sp) => (
              <SelectItem key={sp.supplier_id} value={sp.supplier_id}>
                {sp.supplier_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Importer override */}
      {importerSuppliers.length > 0 && (
        <Select
          value={importerOverrideId || '_default'}
          onValueChange={(v) => onImporterOverride(v === '_default' ? null : v)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <div className="flex items-center gap-1 truncate">
              <Building2 className="h-3 w-3 shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_default">{t('ml.editor.fromProduct')}</SelectItem>
            {importerSuppliers.map((sp) => (
              <SelectItem key={sp.supplier_id} value={sp.supplier_id}>
                {sp.supplier_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="w-px h-5 bg-border mx-1" />

      {/* Undo/Redo */}
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo}>
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      {/* Prominent Save button(s) */}
      {isBuiltinTemplate ? (
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onSaveAs}>
          <Copy className="h-3.5 w-3.5" />
          {t('ml.editor.saveAsCopy')}
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onSave}
            disabled={saveStatus === 'saving'}
          >
            <Save className="h-3.5 w-3.5" />
            {saveStatus === 'saving' ? t('ml.editor.saving') : t('ml.editor.save')}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onSaveAs}>
            <Copy className="h-3.5 w-3.5" />
            {t('ml.editor.saveAs')}
          </Button>
        </div>
      )}

      <div className="w-px h-5 bg-border mx-1" />

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

      {/* Generate PDF - Split Button */}
      <div className="flex items-center gap-0.5">
        <Button
          onClick={onGeneratePDF}
          disabled={isGenerating}
          size="sm"
          className="h-8 rounded-r-none"
        >
          {isGenerating ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          {t('ml.generatePDF')}
        </Button>
        <Button
          onClick={onOpenMultiLabelDialog}
          disabled={isGenerating}
          size="sm"
          variant="outline"
          className="h-8 px-2 rounded-l-none border-l-0"
          title={t('ml.export.title')}
        >
          <Package className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
