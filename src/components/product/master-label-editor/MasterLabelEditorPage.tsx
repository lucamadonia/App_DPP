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
  LabelSectionId,
  LabelEditorView,
  LabelSettingsPanelTab,
  MasterLabelTemplate,
  BuiltinPictogram,
} from '@/types/master-label-editor';
import type { MasterLabelData, LabelVariant } from '@/types/master-label';
import type { BatchListItem } from '@/types/product';
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
import { LabelTemplateGallery } from './LabelTemplateGallery';

interface MasterLabelEditorPageProps {
  data: MasterLabelData | null;
  batches: BatchListItem[];
  variant: LabelVariant;
  onVariantChange: (v: LabelVariant) => void;
  selectedBatchId: string;
  onBatchChange: (id: string) => void;
  onBack: () => void;
}

export function MasterLabelEditorPage({
  data,
  batches,
  variant,
  onVariantChange,
  selectedBatchId,
  onBatchChange,
  onBack: _onBack,
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

  // Hooks
  const history = useLabelEditorHistory(design);
  const drag = useLabelDragReorder();
  const changeCountRef = useRef(0);

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

    const template: MasterLabelTemplate = {
      id: activeTemplate && !activeTemplate.isDefault ? activeTemplate.id : generateTemplateId(),
      name: saveTemplateName,
      description: '',
      category: 'custom',
      variant: 'universal',
      design: JSON.parse(JSON.stringify(design)),
      isDefault: false,
      createdAt: new Date().toISOString(),
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
  }, [saveTemplateName, activeTemplate, design, autosave]);

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
        setShowSaveDialog(true);
        setSaveTemplateName(activeTemplate?.name || '');
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
  }, [view, handleUndo, handleRedo, selectedElementId, duplicateElement, deleteElement, activeTemplate]);

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const elementType = e.dataTransfer.getData('text/plain') as LabelElementType;
    if (elementType) {
      // Insert into the first visible section
      const firstVisible = design.sections.find(s => s.visible);
      if (firstVisible) {
        addElement(elementType, firstVisible.id);
      }
    }
  }, [design.sections, addElement]);

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
            onSave={() => {
              setShowSaveDialog(true);
              setSaveTemplateName(activeTemplate?.name || '');
            }}
            zoom={zoom}
            onZoomChange={setZoom}
            isGenerating={isGenerating}
            onGeneratePDF={handleGeneratePDF}
            onBack={() => setView('gallery')}
          />
        }
        palette={
          <LabelElementPalette
            onDragStart={drag.handlePaletteDragStart}
            onClickAdd={(type) => {
              const firstVisible = design.sections.find(s => s.visible);
              if (firstVisible) addElement(type, firstVisible.id);
            }}
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
            onDragElementStart={drag.handleDragStart}
            onInsertElement={addElement}
            onToggleSectionCollapsed={toggleSectionCollapsed}
            onSectionDragStart={drag.handleSectionDragStart}
            dragTargetSectionIndex={drag.dragState.isDragging ? drag.dragState.targetIndex : null}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          />
        }
        rightPane={
          <Tabs value={rightPanelTab} onValueChange={(v) => setRightPanelTab(v as LabelSettingsPanelTab)}>
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="preview" className="text-xs">{t('ml.editor.tabPreview')}</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">{t('ml.editor.tabSettings')}</TabsTrigger>
              <TabsTrigger value="design" className="text-xs">{t('ml.editor.tabDesign')}</TabsTrigger>
              <TabsTrigger value="pictograms" className="text-xs">{t('ml.editor.tabPictograms')}</TabsTrigger>
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
              />
            </TabsContent>

            <TabsContent value="pictograms" className="mt-0">
              <LabelPictogramLibrary
                onInsert={insertPictogram}
              />
            </TabsContent>
          </Tabs>
        }
      />

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('ml.template.saveTitle')}</DialogTitle>
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
