import { useState, useCallback, useEffect, useRef } from 'react';
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
import type {
  LabelDesign,
  LabelElement,
  LabelElementType,
  LabelFieldKey,
  LabelSectionId,
  LabelEditorView,
  LabelSettingsPanelTab,
  MasterLabelTemplate,
  BuiltinPictogram,
} from '@/types/master-label-editor';
import type { MasterLabelData, LabelVariant } from '@/types/master-label';
import type { BatchListItem } from '@/types/product';
import type { SupplierProduct } from '@/types/database';
import { Textarea } from '@/components/ui/textarea';
import { createBlankDesign, createElement, generateElementId, generateTemplateId } from '@/lib/master-label-defaults';
import { useLabelEditorHistory } from './hooks/useLabelEditorHistory';
import { useLabelDragReorder } from './hooks/useLabelDragReorder';
import { useLabelAutosave } from './hooks/useLabelAutosave';
import { saveMasterLabelTemplate, getMasterLabelTemplates, deleteMasterLabelTemplate } from '@/services/supabase/master-label-templates';
import { LabelEditorLayout } from './LabelEditorLayout';
import { LabelEditorToolbar } from './LabelEditorToolbar';
import { LabelElementPalette } from './LabelElementPalette';
import { LabelCanvas } from './LabelCanvas';
import { LabelElementSettingsPanel } from './LabelElementSettingsPanel';
import { LabelDesignSettingsPanel } from './LabelDesignSettingsPanel';
import { LabelPictogramLibrary } from './LabelPictogramLibrary';
import { LabelComplianceChecker } from './LabelComplianceChecker';
import { LabelTemplateGallery } from './LabelTemplateGallery';
import { detectProductGroup } from '@/lib/master-label-assembler';
import { useBranding } from '@/hooks/use-branding';
import { ShieldCheck } from 'lucide-react';

interface MasterLabelEditorPageProps {
  data: MasterLabelData | null;
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

export function MasterLabelEditorPage({
  data,
  batches,
  variant,
  onVariantChange,
  selectedBatchId,
  onBatchChange,
  onBack: _onBack,
  productSuppliers = [],
  manufacturerOverrideId,
  onManufacturerOverride,
  importerOverrideId,
  onImporterOverride,
}: MasterLabelEditorPageProps) {
  const { t } = useTranslation('products');

  // View state
  const [view, setView] = useState<LabelEditorView>('gallery');
  const [activeTemplate, setActiveTemplate] = useState<MasterLabelTemplate | null>(null);
  const [design, setDesign] = useState<LabelDesign>(createBlankDesign());
  const [customTemplates, setCustomTemplates] = useState<MasterLabelTemplate[]>([]);

  // Editor state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rightPanelTab, setRightPanelTab] = useState<LabelSettingsPanelTab>('settings');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDescription, setSaveTemplateDescription] = useState('');
  const [saveMode, setSaveMode] = useState<'save' | 'saveAs'>('save');

  // Hooks
  const { branding } = useBranding();
  const history = useLabelEditorHistory(design);
  const drag = useLabelDragReorder();
  const changeCountRef = useRef(0);
  const dragSectionRef = useRef<LabelSectionId | null>(null);

  // Autosave
  const autosave = useLabelAutosave(
    async () => {
      if (activeTemplate && !activeTemplate.isDefault) {
        await saveMasterLabelTemplate({ ...activeTemplate, design });
      }
    },
    hasChanges,
  );

  // Load custom templates
  useEffect(() => {
    getMasterLabelTemplates().then(setCustomTemplates).catch(console.error);
  }, []);

  // Design update helper
  const updateDesign = useCallback((newDesign: LabelDesign) => {
    setDesign(newDesign);
    history.push(newDesign);
    setHasChanges(true);
    changeCountRef.current += 1;
  }, [history]);

  // ---------------------------------------------------------------------------
  // Element CRUD
  // ---------------------------------------------------------------------------

  const addElement = useCallback((type: LabelElementType, sectionId: LabelSectionId, afterIndex = -1) => {
    const sectionElements = design.elements.filter(e => e.sectionId === sectionId);
    const newSortOrder = afterIndex >= 0 ? afterIndex + 1 : sectionElements.length;

    // Shift existing elements
    const updatedElements = design.elements.map(e => {
      if (e.sectionId === sectionId && e.sortOrder >= newSortOrder) {
        return { ...e, sortOrder: e.sortOrder + 1 };
      }
      return e;
    });

    const newElement = createElement(type, sectionId, newSortOrder);
    updateDesign({ ...design, elements: [...updatedElements, newElement] });
    setSelectedElementId(newElement.id);
    setRightPanelTab('settings');
  }, [design, updateDesign]);

  const updateElement = useCallback((updated: LabelElement) => {
    const elements = design.elements.map(e => e.id === updated.id ? updated : e);
    updateDesign({ ...design, elements });
  }, [design, updateDesign]);

  const deleteElement = useCallback((elementId: string) => {
    const elements = design.elements.filter(e => e.id !== elementId);
    updateDesign({ ...design, elements });
    if (selectedElementId === elementId) setSelectedElementId(null);
  }, [design, updateDesign, selectedElementId]);

  const duplicateElement = useCallback((elementId: string) => {
    const source = design.elements.find(e => e.id === elementId);
    if (!source) return;
    const clone = { ...source, id: generateElementId(), sortOrder: source.sortOrder + 1 };
    // Shift
    const elements = design.elements.map(e => {
      if (e.sectionId === source.sectionId && e.sortOrder > source.sortOrder) {
        return { ...e, sortOrder: e.sortOrder + 1 };
      }
      return e;
    });
    updateDesign({ ...design, elements: [...elements, clone] });
    setSelectedElementId(clone.id);
  }, [design, updateDesign]);

  const moveElement = useCallback((elementId: string, direction: 'up' | 'down') => {
    const element = design.elements.find(e => e.id === elementId);
    if (!element) return;

    const sectionElements = design.elements
      .filter(e => e.sectionId === element.sectionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const idx = sectionElements.findIndex(e => e.id === elementId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sectionElements.length) return;

    const swapElement = sectionElements[swapIdx];
    const elements = design.elements.map(e => {
      if (e.id === elementId) return { ...e, sortOrder: swapElement.sortOrder };
      if (e.id === swapElement.id) return { ...e, sortOrder: element.sortOrder };
      return e;
    });
    updateDesign({ ...design, elements });
  }, [design, updateDesign]);

  // ---------------------------------------------------------------------------
  // Section operations
  // ---------------------------------------------------------------------------

  const toggleSectionCollapsed = useCallback((sectionId: LabelSectionId) => {
    const sections = design.sections.map(s =>
      s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
    );
    setDesign({ ...design, sections });
  }, [design]);

  // ---------------------------------------------------------------------------
  // Pictogram insert
  // ---------------------------------------------------------------------------

  const insertPictogram = useCallback((pictogram: BuiltinPictogram) => {
    // Insert into the compliance section by default, or sustainability for recycling
    const sectionId: LabelSectionId = pictogram.category === 'recycling' ? 'sustainability' : 'compliance';
    const sectionElements = design.elements.filter(e => e.sectionId === sectionId);

    const newElement = createElement('pictogram', sectionId, sectionElements.length);
    (newElement as any).pictogramId = pictogram.id;
    (newElement as any).source = 'builtin';
    (newElement as any).showLabel = true;
    (newElement as any).labelText = pictogram.name;

    updateDesign({ ...design, elements: [...design.elements, newElement] });
    setSelectedElementId(newElement.id);
  }, [design, updateDesign]);

  // ---------------------------------------------------------------------------
  // Template operations
  // ---------------------------------------------------------------------------

  const handleSelectTemplate = useCallback((template: MasterLabelTemplate) => {
    const clonedDesign: LabelDesign = JSON.parse(JSON.stringify(template.design));
    setActiveTemplate(template);
    setDesign(clonedDesign);
    history.reset(clonedDesign);
    setView('editor');
    setHasChanges(false);
    setSelectedElementId(null);
  }, [history]);

  const handleNewBlank = useCallback(() => {
    const blank = createBlankDesign();
    setActiveTemplate(null);
    setDesign(blank);
    history.reset(blank);
    setView('editor');
    setHasChanges(false);
    setSelectedElementId(null);
  }, [history]);

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    await deleteMasterLabelTemplate(templateId);
    setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!saveTemplateName.trim()) return;

    const isOverwrite = saveMode === 'save' && activeTemplate && !activeTemplate.isDefault;
    const template: MasterLabelTemplate = {
      id: isOverwrite ? activeTemplate.id : generateTemplateId(),
      name: saveTemplateName,
      description: saveTemplateDescription,
      category: 'custom',
      variant: 'universal',
      design: JSON.parse(JSON.stringify(design)),
      isDefault: false,
      createdAt: isOverwrite ? activeTemplate.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await saveMasterLabelTemplate(template);
    if (result.success) {
      setActiveTemplate(template);
      setCustomTemplates(prev => {
        const idx = prev.findIndex(t => t.id === template.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = template;
          return updated;
        }
        return [...prev, template];
      });
      setHasChanges(false);
      autosave.markSaved();
    }
    setShowSaveDialog(false);
  }, [saveTemplateName, saveTemplateDescription, saveMode, activeTemplate, design, autosave]);

  // Direct save for custom templates (no dialog)
  const handleDirectSave = useCallback(async () => {
    if (!activeTemplate || activeTemplate.isDefault) {
      // For built-in or no template: open save-as dialog
      setSaveMode('saveAs');
      setSaveTemplateName(activeTemplate?.name ? `${activeTemplate.name} (Copy)` : '');
      setSaveTemplateDescription(activeTemplate?.description || '');
      setShowSaveDialog(true);
      return;
    }
    // Overwrite existing custom template
    const template: MasterLabelTemplate = {
      ...activeTemplate,
      design: JSON.parse(JSON.stringify(design)),
      updatedAt: new Date().toISOString(),
    };
    const result = await saveMasterLabelTemplate(template);
    if (result.success) {
      setActiveTemplate(template);
      setCustomTemplates(prev => {
        const idx = prev.findIndex(t => t.id === template.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = template;
          return updated;
        }
        return [...prev, template];
      });
      setHasChanges(false);
      autosave.markSaved();
    }
  }, [activeTemplate, design, autosave]);

  const handleSaveAs = useCallback(() => {
    setSaveMode('saveAs');
    const baseName = activeTemplate?.name || '';
    const isBuiltin = activeTemplate?.isDefault;
    setSaveTemplateName(isBuiltin ? `${baseName} (Copy)` : baseName);
    setSaveTemplateDescription(activeTemplate?.description || '');
    setShowSaveDialog(true);
  }, [activeTemplate]);

  // ---------------------------------------------------------------------------
  // Undo/Redo
  // ---------------------------------------------------------------------------

  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (entry) {
      setDesign(entry.design);
      setHasChanges(true);
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (entry) {
      setDesign(entry.design);
      setHasChanges(true);
    }
  }, [history]);

  // ---------------------------------------------------------------------------
  // PDF Generation
  // ---------------------------------------------------------------------------

  const handleGeneratePDF = useCallback(async () => {
    if (!data) return;
    setIsGenerating(true);
    try {
      const { generateMasterLabelEditorPDF } = await import('@/lib/master-label-pdf-renderer');
      await generateMasterLabelEditorPDF(design, data);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [design, data]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (view !== 'editor') return;

    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (isCtrl && e.key === 's') {
        e.preventDefault();
        handleDirectSave();
      } else if (isCtrl && e.key === 'd' && selectedElementId) {
        e.preventDefault();
        duplicateElement(selectedElementId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId && !isCtrl) {
        // Only delete if not focused on an input
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, handleUndo, handleRedo, handleDirectSave, selectedElementId, duplicateElement, deleteElement, activeTemplate]);

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const addFieldElement = useCallback((fieldKey: LabelFieldKey) => {
    const firstVisible = design.sections.find(s => s.visible);
    if (!firstVisible) return;

    const sectionElements = design.elements.filter(e => e.sectionId === firstVisible.id);
    const newSortOrder = sectionElements.length;

    // Shift existing elements
    const updatedElements = design.elements.map(e => {
      if (e.sectionId === firstVisible.id && e.sortOrder >= newSortOrder) {
        return { ...e, sortOrder: e.sortOrder + 1 };
      }
      return e;
    });

    const newElement = createElement('field-value', firstVisible.id, newSortOrder);
    // Pre-configure with the selected field key
    (newElement as any).fieldKey = fieldKey;
    (newElement as any).showLabel = true;
    (newElement as any).layout = 'inline';

    updateDesign({ ...design, elements: [...updatedElements, newElement] });
    setSelectedElementId(newElement.id);
    setRightPanelTab('settings');
  }, [design, updateDesign]);

  const addComplianceBadge = useCallback((badgeId: string, symbol: string) => {
    const compSection = design.sections.find(s => s.id === 'compliance' && s.visible) || design.sections.find(s => s.visible);
    if (!compSection) return;

    const sectionElements = design.elements.filter(e => e.sectionId === compSection.id);
    const newElement = createElement('compliance-badge', compSection.id, sectionElements.length);
    (newElement as any).badgeId = badgeId;
    (newElement as any).symbol = symbol;

    updateDesign({ ...design, elements: [...design.elements, newElement] });
    setSelectedElementId(newElement.id);
  }, [design, updateDesign]);

  const addCompliancePictogram = useCallback((pictogramId: string) => {
    const compSection = design.sections.find(s => s.id === 'compliance' && s.visible) || design.sections.find(s => s.visible);
    if (!compSection) return;

    const sectionElements = design.elements.filter(e => e.sectionId === compSection.id);
    const newElement = createElement('pictogram', compSection.id, sectionElements.length);
    (newElement as any).pictogramId = pictogramId;
    (newElement as any).source = 'builtin';
    (newElement as any).showLabel = false;

    updateDesign({ ...design, elements: [...design.elements, newElement] });
    setSelectedElementId(newElement.id);
  }, [design, updateDesign]);

  const handleElementDrop = useCallback((targetIndex: number): boolean => {
    const result = drag.handleDrop(targetIndex);
    if (!result) return false;

    if (result.type === 'reorder' && dragSectionRef.current) {
      const sectionId = dragSectionRef.current;
      const sectionElements = design.elements
        .filter(e => e.sectionId === sectionId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const moved = sectionElements.splice(result.from, 1)[0];
      if (!moved) { dragSectionRef.current = null; return false; }
      sectionElements.splice(result.to, 0, moved);

      const updated = design.elements.map(e => {
        if (e.sectionId !== sectionId) return e;
        const newOrder = sectionElements.findIndex(se => se.id === e.id);
        return { ...e, sortOrder: newOrder };
      });

      updateDesign({ ...design, elements: updated });
      dragSectionRef.current = null;
      return true;
    }

    if (result.type === 'insert' && dragSectionRef.current) {
      addElement(result.elementType, dragSectionRef.current, targetIndex);
      dragSectionRef.current = null;
      return true;
    }

    // insert without a tracked section — use first visible section
    if (result.type === 'insert') {
      const firstVisible = design.sections.find(s => s.visible);
      if (firstVisible) {
        addElement(result.elementType, firstVisible.id, targetIndex);
      }
      dragSectionRef.current = null;
      return true;
    }

    dragSectionRef.current = null;
    return false;
  }, [drag, design, updateDesign, addElement]);

  const handleSectionDrop = useCallback((targetIndex: number): boolean => {
    const result = drag.handleDrop(targetIndex);
    if (!result) return false;

    if (result.type === 'section-reorder') {
      const sorted = [...design.sections].sort((a, b) => a.sortOrder - b.sortOrder);
      const moved = sorted.splice(result.from, 1)[0];
      if (!moved) return false;
      sorted.splice(result.to, 0, moved);

      const sections = design.sections.map(s => {
        const newOrder = sorted.findIndex(ss => ss.id === s.id);
        return { ...s, sortOrder: newOrder };
      });

      updateDesign({ ...design, sections });
      return true;
    }

    return false;
  }, [drag, design, updateDesign]);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain');

    // Handle field: prefix from the Field Browser
    if (rawData.startsWith('field:')) {
      const fieldKey = rawData.slice(6) as LabelFieldKey;
      addFieldElement(fieldKey);
      return;
    }

    const elementType = rawData as LabelElementType;
    if (elementType) {
      // Insert into the first visible section
      const firstVisible = design.sections.find(s => s.visible);
      if (firstVisible) {
        addElement(elementType, firstVisible.id);
      }
    }
  }, [design.sections, addElement, addFieldElement]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const selectedElement = selectedElementId
    ? design.elements.find(e => e.id === selectedElementId) || null
    : null;

  // Gallery view
  if (view === 'gallery') {
    return (
      <LabelTemplateGallery
        customTemplates={customTemplates}
        onSelect={handleSelectTemplate}
        onNewBlank={handleNewBlank}
        onDelete={handleDeleteTemplate}
      />
    );
  }

  // Editor view
  return (
    <>
      <LabelEditorLayout
        toolbar={
          <LabelEditorToolbar
            templateName={activeTemplate?.name || t('ml.template.untitled')}
            variant={variant}
            onVariantChange={onVariantChange}
            batches={batches}
            selectedBatchId={selectedBatchId}
            onBatchChange={onBatchChange}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            saveStatus={autosave.status}
            onSave={handleDirectSave}
            onSaveAs={handleSaveAs}
            isBuiltinTemplate={!!activeTemplate?.isDefault}
            zoom={zoom}
            onZoomChange={setZoom}
            isGenerating={isGenerating}
            onGeneratePDF={handleGeneratePDF}
            onBack={() => setView('gallery')}
            productSuppliers={productSuppliers}
            manufacturerOverrideId={manufacturerOverrideId}
            onManufacturerOverride={onManufacturerOverride}
            importerOverrideId={importerOverrideId}
            onImporterOverride={onImporterOverride}
          />
        }
        palette={
          <LabelElementPalette
            onDragStart={drag.handlePaletteDragStart}
            onClickAdd={(type) => {
              const firstVisible = design.sections.find(s => s.visible);
              if (firstVisible) addElement(type, firstVisible.id);
            }}
            onFieldDragStart={() => {}}
            onFieldClickAdd={(fieldKey) => addFieldElement(fieldKey)}
          />
        }
        canvas={
          <LabelCanvas
            design={design}
            data={data}
            zoom={zoom}
            selectedElementId={selectedElementId}
            hoveredElementId={hoveredElementId}
            onSelectElement={setSelectedElementId}
            onHoverElement={setHoveredElementId}
            onMoveElement={moveElement}
            onDuplicateElement={duplicateElement}
            onDeleteElement={deleteElement}
            onDragElementStart={(index, sectionId) => {
              dragSectionRef.current = sectionId;
              drag.handleDragStart(index);
            }}
            onInsertElement={addElement}
            onToggleSectionCollapsed={toggleSectionCollapsed}
            onSectionDragStart={drag.handleSectionDragStart}
            onDragElementOver={drag.handleDragOver}
            onDropElement={handleElementDrop}
            onDragElementEnd={drag.handleDragEnd}
            onSectionDragOver={drag.handleDragOver}
            onDropSection={handleSectionDrop}
            dragTargetSectionIndex={drag.dragState.isDragging ? drag.dragState.targetIndex : null}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          />
        }
        rightPane={
          <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as LabelSettingsPanelTab)}>
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
                {/* Inline mini preview — reuses canvas at small scale */}
                <div className="border rounded bg-white p-2 w-full overflow-hidden">
                  <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: '222%' }}>
                    <LabelCanvas
                      design={design}
                      data={data}
                      zoom={100}
                      selectedElementId={null}
                      hoveredElementId={null}
                      onSelectElement={() => {}}
                      onHoverElement={() => {}}
                      onMoveElement={() => {}}
                      onDuplicateElement={() => {}}
                      onDeleteElement={() => {}}
                      onDragElementStart={() => {}}
                      onInsertElement={() => {}}
                      onToggleSectionCollapsed={() => {}}
                      onSectionDragStart={() => {}}
                      onDragElementOver={() => {}}
                      onDropElement={() => false}
                      onDragElementEnd={() => {}}
                      onSectionDragOver={() => {}}
                      onDropSection={() => false}
                      dragTargetSectionIndex={null}
                      onDragOver={() => {}}
                      onDrop={() => {}}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <LabelElementSettingsPanel
                element={selectedElement}
                onChange={updateElement}
              />
            </TabsContent>

            <TabsContent value="design" className="mt-0">
              <LabelDesignSettingsPanel
                design={design}
                onDesignChange={updateDesign}
                brandingLogo={branding.logo}
                brandingPrimaryColor={branding.primaryColor}
              />
            </TabsContent>

            <TabsContent value="pictograms" className="mt-0">
              <LabelPictogramLibrary
                onInsert={insertPictogram}
              />
            </TabsContent>

            <TabsContent value="check" className="mt-0">
              <LabelComplianceChecker
                design={design}
                data={data}
                productGroup={data ? data.productGroup : detectProductGroup('')}
                variant={variant}
                onAddField={(fieldKey) => addFieldElement(fieldKey)}
                onAddBadge={(badgeId, symbol) => addComplianceBadge(badgeId, symbol)}
                onAddPictogram={(pictogramId) => addCompliancePictogram(pictogramId)}
                onSelectElement={(elementId) => {
                  setSelectedElementId(elementId);
                  setRightPanelTab('settings');
                }}
              />
            </TabsContent>
          </Tabs>
        }
      />

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {saveMode === 'saveAs' ? t('ml.editor.saveAs') : t('ml.template.saveTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label>{t('ml.template.name')}</Label>
              <Input
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder={t('ml.template.namePlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTemplate();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('ml.template.description')}</Label>
              <Textarea
                value={saveTemplateDescription}
                onChange={(e) => setSaveTemplateDescription(e.target.value)}
                placeholder={t('ml.template.descriptionPlaceholder')}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!saveTemplateName.trim()}>
              {t('ml.template.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
