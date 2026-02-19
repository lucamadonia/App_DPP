import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck } from 'lucide-react';
import type { MasterLabelData, LabelVariant } from '@/types/master-label';
import type { BatchListItem } from '@/types/product';
import type { SupplierProduct } from '@/types/database';
import { detectProductGroup } from '@/lib/master-label-assembler';
import { LabelEditorProvider, useLabelEditor } from './LabelEditorContext';
import { LabelEditorLayout } from './LabelEditorLayout';
import { LabelEditorToolbar } from './LabelEditorToolbar';
import { LabelElementPalette } from './LabelElementPalette';
import { LabelCanvas } from './LabelCanvas';
import { LabelElementSettingsPanel } from './LabelElementSettingsPanel';
import { LabelDesignSettingsPanel } from './LabelDesignSettingsPanel';
import { LabelPictogramLibrary } from './LabelPictogramLibrary';
import { LabelComplianceChecker } from './LabelComplianceChecker';
import { LabelTemplateGallery } from './LabelTemplateGallery';
import { MultiLabelExportDialog } from './MultiLabelExportDialog';

// ---------------------------------------------------------------------------
// Public interface — same as before
// ---------------------------------------------------------------------------

interface MasterLabelEditorPageProps {
  data: MasterLabelData | null;
  product: { manufacturer?: string; importer?: string; gtin: string };
  batches: BatchListItem[];
  variant: LabelVariant;
  onVariantChange: (v: LabelVariant) => void;
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
  onBack: () => void;
  productSuppliers?: Array<SupplierProduct & { supplier_name: string; supplier_country: string }>;
  manufacturerOverrideId: string | null;
  onManufacturerOverride: (id: string | null) => void;
  importerOverrideId: string | null;
  onImporterOverride: (id: string | null) => void;
}

export function MasterLabelEditorPage(props: MasterLabelEditorPageProps) {
  return (
    <LabelEditorProvider {...props}>
      <MasterLabelEditorInner />
    </LabelEditorProvider>
  );
}

// ---------------------------------------------------------------------------
// Inner component — consumes context
// ---------------------------------------------------------------------------

function MasterLabelEditorInner() {
  const { t } = useTranslation('products');
  const ctx = useLabelEditor();

  // Gallery view
  if (ctx.view === 'gallery') {
    return (
      <LabelTemplateGallery
        customTemplates={ctx.customTemplates}
        onSelect={ctx.handleSelectTemplate}
        onNewBlank={ctx.handleNewBlank}
        onDelete={ctx.handleDeleteTemplate}
      />
    );
  }

  // Editor view
  return (
    <>
      <LabelEditorLayout
        toolbar={
          <LabelEditorToolbar
            templateName={ctx.activeTemplate?.name || t('ml.template.untitled')}
            variant={ctx.variant}
            onVariantChange={ctx.onVariantChange}
            batches={ctx.batches}
            selectedBatchId={ctx.selectedBatchId}
            onBatchChange={ctx.onBatchChange}
            canUndo={ctx.canUndo}
            canRedo={ctx.canRedo}
            onUndo={ctx.handleUndo}
            onRedo={ctx.handleRedo}
            saveStatus={ctx.autosaveStatus}
            onSave={ctx.handleDirectSave}
            onSaveAs={ctx.handleSaveAs}
            isBuiltinTemplate={!!ctx.activeTemplate?.isDefault}
            zoom={ctx.zoom}
            onZoomChange={ctx.setZoom}
            isGenerating={ctx.isGenerating}
            onGeneratePDF={ctx.handleGeneratePDF}
            onOpenMultiLabelDialog={() => ctx.setShowMultiLabelDialog(true)}
            onBack={() => ctx.setView('gallery')}
            product={ctx.product}
            productSuppliers={ctx.productSuppliers}
            manufacturerOverrideId={ctx.manufacturerOverrideId}
            onManufacturerOverride={ctx.onManufacturerOverride}
            importerOverrideId={ctx.importerOverrideId}
            onImporterOverride={ctx.onImporterOverride}
          />
        }
        palette={
          <LabelElementPalette
            onDragStart={() => {}}
            onClickAdd={(type) => {
              const firstVisible = ctx.design.sections.find(s => s.visible);
              if (firstVisible) ctx.addElement(type, firstVisible.id);
            }}
            onFieldDragStart={() => {}}
            onFieldClickAdd={(fieldKey) => ctx.addFieldElement(fieldKey)}
          />
        }
        canvas={
          <LabelCanvas
            design={ctx.design}
            data={ctx.data}
            zoom={ctx.zoom}
            selectedElementId={ctx.selectedElementId}
            hoveredElementId={ctx.hoveredElementId}
            onSelectElement={ctx.setSelectedElementId}
            onHoverElement={ctx.setHoveredElementId}
            onMoveElement={ctx.moveElement}
            onDuplicateElement={ctx.duplicateElement}
            onDeleteElement={ctx.deleteElement}
            onInsertElement={ctx.addElement}
            onToggleSectionCollapsed={ctx.toggleSectionCollapsed}
            onReorderElement={ctx.reorderElement}
            onMoveElementToSection={ctx.moveElementToSection}
            onReorderSections={ctx.reorderSections}
            onCanvasDragOver={ctx.handleCanvasDragOver}
            onCanvasDrop={ctx.handleCanvasDrop}
            onZoomChange={ctx.setZoom}
          />
        }
        rightPane={
          <Tabs value={ctx.rightPanelTab} onValueChange={(v) => ctx.setRightPanelTab(v as any)}>
            <TabsList className="w-full grid grid-cols-5 h-9">
              <TabsTrigger value="preview" className="text-xs">{t('ml.editor.tabPreview')}</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">{t('ml.editor.tabSettings')}</TabsTrigger>
              <TabsTrigger value="design" className="text-xs">{t('ml.editor.tabDesign')}</TabsTrigger>
              <TabsTrigger value="pictograms" className="text-xs">{t('ml.editor.tabPictograms')}</TabsTrigger>
              <TabsTrigger value="check" className="text-xs gap-1">
                <ShieldCheck className="h-3 w-3" />
                {t('ml.editor.tabCheck')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-0">
              <div className="p-4 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">{t('ml.editor.livePreview')}</p>
                <div className="border rounded bg-white p-2 w-full overflow-hidden">
                  <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: '222%' }}>
                    <LabelCanvas
                      design={ctx.design}
                      data={ctx.data}
                      zoom={100}
                      selectedElementId={null}
                      hoveredElementId={null}
                      onSelectElement={() => {}}
                      onHoverElement={() => {}}
                      onMoveElement={() => {}}
                      onDuplicateElement={() => {}}
                      onDeleteElement={() => {}}
                      onInsertElement={() => {}}
                      onToggleSectionCollapsed={() => {}}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <LabelElementSettingsPanel
                element={ctx.selectedElement}
                onChange={ctx.updateElement}
              />
            </TabsContent>

            <TabsContent value="design" className="mt-0">
              <LabelDesignSettingsPanel
                design={ctx.design}
                onDesignChange={ctx.updateDesign}
                brandingLogo={ctx.branding.logo}
                brandingPrimaryColor={ctx.branding.primaryColor}
              />
            </TabsContent>

            <TabsContent value="pictograms" className="mt-0">
              <LabelPictogramLibrary
                onInsert={ctx.insertPictogram}
              />
            </TabsContent>

            <TabsContent value="check" className="mt-0">
              <LabelComplianceChecker
                design={ctx.design}
                data={ctx.data}
                productGroup={ctx.data ? ctx.data.productGroup : detectProductGroup('')}
                variant={ctx.variant}
                onAddField={(fieldKey) => ctx.addFieldElement(fieldKey)}
                onAddBadge={(badgeId, symbol) => ctx.addComplianceBadge(badgeId, symbol)}
                onAddPictogram={(pictogramId) => ctx.addCompliancePictogram(pictogramId)}
                onSelectElement={(elementId) => {
                  ctx.setSelectedElementId(elementId);
                  ctx.setRightPanelTab('settings');
                }}
              />
            </TabsContent>
          </Tabs>
        }
      />

      {/* Save Template Dialog */}
      <Dialog open={ctx.showSaveDialog} onOpenChange={ctx.setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {ctx.saveMode === 'saveAs' ? t('ml.editor.saveAs') : t('ml.template.saveTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label>{t('ml.template.name')}</Label>
              <Input
                value={ctx.saveTemplateName}
                onChange={(e) => ctx.setSaveTemplateName(e.target.value)}
                placeholder={t('ml.template.namePlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') ctx.handleSaveTemplate();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('ml.template.description')}</Label>
              <Textarea
                value={ctx.saveTemplateDescription}
                onChange={(e) => ctx.setSaveTemplateDescription(e.target.value)}
                placeholder={t('ml.template.descriptionPlaceholder')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => ctx.setShowSaveDialog(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={ctx.handleSaveTemplate} disabled={!ctx.saveTemplateName.trim()}>
              {t('ml.template.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Label Export Dialog */}
      <MultiLabelExportDialog
        open={ctx.showMultiLabelDialog}
        onOpenChange={ctx.setShowMultiLabelDialog}
        onExport={ctx.handleMultiLabelExport}
        hasCounterElement={ctx.hasCounterElement}
      />
    </>
  );
}
