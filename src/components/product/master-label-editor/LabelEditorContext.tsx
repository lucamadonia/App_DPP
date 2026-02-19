import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/use-branding';
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
  MultiLabelExportConfig,
} from '@/types/master-label-editor';
import type { MasterLabelData, LabelVariant } from '@/types/master-label';
import type { BatchListItem } from '@/types/product';
import type { SupplierProduct } from '@/types/database';
import {
  createBlankDesign,
  createElement,
  generateElementId,
  generateTemplateId,
} from '@/lib/master-label-defaults';
import { detectProductGroup } from '@/lib/master-label-assembler';
import { useLabelEditorHistory } from './hooks/useLabelEditorHistory';
import { useLabelAutosave } from './hooks/useLabelAutosave';
import {
  saveMasterLabelTemplate,
  getMasterLabelTemplates,
  deleteMasterLabelTemplate,
} from '@/services/supabase/master-label-templates';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface LabelEditorState {
  // View
  view: LabelEditorView;
  activeTemplate: MasterLabelTemplate | null;
  design: LabelDesign;
  customTemplates: MasterLabelTemplate[];

  // Selection
  selectedElementId: string | null;
  selectedElement: LabelElement | null;
  hoveredElementId: string | null;

  // UI state
  zoom: number;
  rightPanelTab: LabelSettingsPanelTab;
  isGenerating: boolean;
  hasChanges: boolean;
  showMultiLabelDialog: boolean;
  showSaveDialog: boolean;
  saveTemplateName: string;
  saveTemplateDescription: string;
  saveMode: 'save' | 'saveAs';

  // External data
  data: MasterLabelData | null;
  product: { manufacturer?: string; importer?: string; gtin: string };
  batches: BatchListItem[];
  variant: LabelVariant;
  selectedBatchId: string;
  productSuppliers: Array<SupplierProduct & { supplier_name: string; supplier_country: string }>;
  manufacturerOverrideId: string | null;
  importerOverrideId: string | null;
  branding: { logo?: string; primaryColor?: string };

  // Computed
  hasCounterElement: boolean;

  // History
  canUndo: boolean;
  canRedo: boolean;

  // Autosave
  autosaveStatus: string;
}

interface LabelEditorActions {
  // Design
  updateDesign: (newDesign: LabelDesign) => void;

  // View
  setView: (view: LabelEditorView) => void;
  setZoom: (zoom: number) => void;
  setRightPanelTab: (tab: LabelSettingsPanelTab) => void;
  setShowMultiLabelDialog: (show: boolean) => void;
  setShowSaveDialog: (show: boolean) => void;
  setSaveTemplateName: (name: string) => void;
  setSaveTemplateDescription: (desc: string) => void;
  setSaveMode: (mode: 'save' | 'saveAs') => void;

  // Selection
  setSelectedElementId: (id: string | null) => void;
  setHoveredElementId: (id: string | null) => void;

  // Element CRUD
  addElement: (type: LabelElementType, sectionId: LabelSectionId, afterIndex?: number) => void;
  updateElement: (updated: LabelElement) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  moveElement: (elementId: string, direction: 'up' | 'down') => void;

  // Section operations
  toggleSectionCollapsed: (sectionId: LabelSectionId) => void;

  // Specialized insert
  addFieldElement: (fieldKey: LabelFieldKey) => void;
  addComplianceBadge: (badgeId: string, symbol: string) => void;
  addCompliancePictogram: (pictogramId: string) => void;
  insertPictogram: (pictogram: BuiltinPictogram) => void;

  // Template operations
  handleSelectTemplate: (template: MasterLabelTemplate) => void;
  handleNewBlank: () => void;
  handleDeleteTemplate: (templateId: string) => Promise<void>;
  handleSaveTemplate: () => Promise<void>;
  handleDirectSave: () => Promise<void>;
  handleSaveAs: () => void;

  // Undo/Redo
  handleUndo: () => void;
  handleRedo: () => void;

  // PDF
  handleGeneratePDF: () => Promise<void>;
  handleMultiLabelExport: (config: MultiLabelExportConfig) => Promise<void>;

  // @dnd-kit callbacks
  reorderElement: (sectionId: string, fromIndex: number, toIndex: number) => void;
  moveElementToSection: (elementId: string, fromSection: string, toSection: string, toIndex: number) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;

  // Palette HTML5 DnD (canvas-level)
  handleCanvasDragOver: (e: React.DragEvent) => void;
  handleCanvasDrop: (e: React.DragEvent) => void;

  // Variant/batch
  onVariantChange: (v: LabelVariant) => void;
  onBatchChange: (id: string) => void;
  onManufacturerOverride: (id: string | null) => void;
  onImporterOverride: (id: string | null) => void;
  onBack: () => void;
}

type LabelEditorContextValue = LabelEditorState & LabelEditorActions;

const LabelEditorContext = createContext<LabelEditorContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLabelEditor(): LabelEditorContextValue {
  const ctx = useContext(LabelEditorContext);
  if (!ctx) throw new Error('useLabelEditor must be used within LabelEditorProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface LabelEditorProviderProps {
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
  children: ReactNode;
}

export function LabelEditorProvider({
  data,
  product,
  batches,
  variant,
  onVariantChange,
  selectedBatchId,
  onBatchChange,
  onBack,
  productSuppliers = [],
  manufacturerOverrideId,
  onManufacturerOverride,
  importerOverrideId,
  onImporterOverride,
  children,
}: LabelEditorProviderProps) {
  const { t, i18n } = useTranslation('products');
  const { toast } = useToast();
  const { branding } = useBranding();

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
  const [showMultiLabelDialog, setShowMultiLabelDialog] = useState(false);

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDescription, setSaveTemplateDescription] = useState('');
  const [saveMode, setSaveMode] = useState<'save' | 'saveAs'>('save');

  // Hooks
  const history = useLabelEditorHistory(design);

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
  }, [history]);

  // ---------------------------------------------------------------------------
  // Element CRUD
  // ---------------------------------------------------------------------------

  const addElement = useCallback((type: LabelElementType, sectionId: LabelSectionId, afterIndex = -1) => {
    const sectionElements = design.elements.filter(e => e.sectionId === sectionId);
    const newSortOrder = afterIndex >= 0 ? afterIndex + 1 : sectionElements.length;

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
  // Specialized inserts
  // ---------------------------------------------------------------------------

  const insertPictogram = useCallback((pictogram: BuiltinPictogram) => {
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

  const addFieldElement = useCallback((fieldKey: LabelFieldKey) => {
    const firstVisible = design.sections.find(s => s.visible);
    if (!firstVisible) return;

    const sectionElements = design.elements.filter(e => e.sectionId === firstVisible.id);
    const newSortOrder = sectionElements.length;

    const updatedElements = design.elements.map(e => {
      if (e.sectionId === firstVisible.id && e.sortOrder >= newSortOrder) {
        return { ...e, sortOrder: e.sortOrder + 1 };
      }
      return e;
    });

    const newElement = createElement('field-value', firstVisible.id, newSortOrder);
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

  const handleDirectSave = useCallback(async () => {
    if (!activeTemplate || activeTemplate.isDefault) {
      setSaveMode('saveAs');
      setSaveTemplateName(activeTemplate?.name ? `${activeTemplate.name} (Copy)` : '');
      setSaveTemplateDescription(activeTemplate?.description || '');
      setShowSaveDialog(true);
      return;
    }
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
    if (!data) {
      toast({
        title: t('ml.export.error.noData'),
        description: t('ml.export.error.noDataDesc'),
        variant: 'destructive',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const { generateMasterLabelEditorPDF } = await import('@/lib/master-label-pdf-renderer');
      await generateMasterLabelEditorPDF(design, data);
      toast({
        title: t('ml.export.success'),
        description: t('ml.export.successDesc'),
      });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast({
        title: t('ml.export.error.failed'),
        description: err instanceof Error ? err.message : t('ml.export.error.unknown'),
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [design, data, toast, t]);

  const handleMultiLabelExport = useCallback(async (config: MultiLabelExportConfig) => {
    if (!data) {
      toast({
        title: t('ml.export.error.noData'),
        description: t('ml.export.error.noDataDesc'),
        variant: 'destructive',
      });
      throw new Error('No data available for export');
    }
    setIsGenerating(true);
    try {
      const { generateMasterLabelEditorPDF } = await import('@/lib/master-label-pdf-renderer');
      await generateMasterLabelEditorPDF(design, data, undefined, config, i18n.language as 'en' | 'de');
      const labelCount = config.labelCount;
      const fileCount = config.filenamePattern === 'batch' ? labelCount : 1;
      toast({
        title: t('ml.export.success'),
        description: t('ml.export.successMulti', { count: labelCount, files: fileCount }),
      });
    } catch (err) {
      console.error('Multi-label export failed:', err);
      toast({
        title: t('ml.export.error.failed'),
        description: err instanceof Error ? err.message : t('ml.export.error.unknown'),
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [design, data, i18n.language, toast, t]);

  // ---------------------------------------------------------------------------
  // @dnd-kit callbacks (used by LabelCanvas → useLabelDndKit)
  // ---------------------------------------------------------------------------

  const reorderElement = useCallback((sectionId: string, fromIndex: number, toIndex: number) => {
    const sectionElements = design.elements
      .filter(e => e.sectionId === sectionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const moved = sectionElements.splice(fromIndex, 1)[0];
    if (!moved) return;
    sectionElements.splice(toIndex, 0, moved);

    const updated = design.elements.map(e => {
      if (e.sectionId !== sectionId) return e;
      const newOrder = sectionElements.findIndex(se => se.id === e.id);
      return { ...e, sortOrder: newOrder };
    });

    updateDesign({ ...design, elements: updated });
  }, [design, updateDesign]);

  const moveElementToSection = useCallback((elementId: string, fromSection: string, toSection: string, toIndex: number) => {
    const element = design.elements.find(e => e.id === elementId);
    if (!element) return;

    // Build the target section's element list and insert
    const toElements = design.elements
      .filter(e => e.sectionId === toSection && e.id !== elementId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const adjustedIndex = toIndex >= 0 && toIndex <= toElements.length ? toIndex : toElements.length;
    toElements.splice(adjustedIndex, 0, { ...element, sectionId: toSection as LabelSectionId });

    // Re-index source section (without moved element)
    const fromElements = design.elements
      .filter(e => e.sectionId === fromSection && e.id !== elementId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const updated = design.elements.map(e => {
      if (e.id === elementId) {
        return { ...e, sectionId: toSection as LabelSectionId, sortOrder: adjustedIndex };
      }
      if (e.sectionId === fromSection) {
        const idx = fromElements.findIndex(se => se.id === e.id);
        return idx >= 0 ? { ...e, sortOrder: idx } : e;
      }
      if (e.sectionId === toSection) {
        const idx = toElements.findIndex(se => se.id === e.id);
        return idx >= 0 ? { ...e, sortOrder: idx } : e;
      }
      return e;
    });

    updateDesign({ ...design, elements: updated });
    setSelectedElementId(elementId);
  }, [design, updateDesign]);

  const reorderSections = useCallback((fromIndex: number, toIndex: number) => {
    const sorted = [...design.sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const moved = sorted.splice(fromIndex, 1)[0];
    if (!moved) return;
    sorted.splice(toIndex, 0, moved);

    const sections = design.sections.map(s => {
      const newOrder = sorted.findIndex(ss => ss.id === s.id);
      return { ...s, sortOrder: newOrder };
    });

    updateDesign({ ...design, sections });
  }, [design, updateDesign]);

  // ---------------------------------------------------------------------------
  // Palette HTML5 DnD handlers (canvas-level, for palette→canvas drops)
  // ---------------------------------------------------------------------------

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain');

    if (rawData.startsWith('field:')) {
      const fieldKey = rawData.slice(6) as LabelFieldKey;
      addFieldElement(fieldKey);
      return;
    }

    const elementType = rawData as LabelElementType;
    if (elementType) {
      const firstVisible = design.sections.find(s => s.visible);
      if (firstVisible) {
        addElement(elementType, firstVisible.id);
      }
    }
  }, [design.sections, addElement, addFieldElement]);

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
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selectedElementId && !isCtrl) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement).isContentEditable) {
          e.preventDefault();
          // Navigate to prev/next element in the same section
          const el = design.elements.find(el => el.id === selectedElementId);
          if (el) {
            const sectionEls = design.elements
              .filter(se => se.sectionId === el.sectionId)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const idx = sectionEls.findIndex(se => se.id === selectedElementId);
            const nextIdx = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
            if (nextIdx >= 0 && nextIdx < sectionEls.length) {
              setSelectedElementId(sectionEls[nextIdx].id);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, handleUndo, handleRedo, handleDirectSave, selectedElementId, duplicateElement, deleteElement, design.elements]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const selectedElement = useMemo(
    () => selectedElementId ? design.elements.find(e => e.id === selectedElementId) || null : null,
    [selectedElementId, design.elements],
  );

  const hasCounterElement = useMemo(
    () => design.elements.some(el => el.type === 'package-counter'),
    [design.elements],
  );

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value = useMemo<LabelEditorContextValue>(() => ({
    // State
    view,
    activeTemplate,
    design,
    customTemplates,
    selectedElementId,
    selectedElement,
    hoveredElementId,
    zoom,
    rightPanelTab,
    isGenerating,
    hasChanges,
    showMultiLabelDialog,
    showSaveDialog,
    saveTemplateName,
    saveTemplateDescription,
    saveMode,
    data,
    product,
    batches,
    variant,
    selectedBatchId,
    productSuppliers,
    manufacturerOverrideId,
    importerOverrideId,
    branding: { logo: branding.logo, primaryColor: branding.primaryColor },
    hasCounterElement,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    autosaveStatus: autosave.status,

    // Actions
    updateDesign,
    setView,
    setZoom,
    setRightPanelTab,
    setShowMultiLabelDialog,
    setShowSaveDialog,
    setSaveTemplateName,
    setSaveTemplateDescription,
    setSaveMode,
    setSelectedElementId,
    setHoveredElementId,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    moveElement,
    toggleSectionCollapsed,
    addFieldElement,
    addComplianceBadge,
    addCompliancePictogram,
    insertPictogram,
    handleSelectTemplate,
    handleNewBlank,
    handleDeleteTemplate,
    handleSaveTemplate,
    handleDirectSave,
    handleSaveAs,
    handleUndo,
    handleRedo,
    handleGeneratePDF,
    handleMultiLabelExport,
    reorderElement,
    moveElementToSection,
    reorderSections,
    handleCanvasDragOver,
    handleCanvasDrop,
    onVariantChange,
    onBatchChange,
    onManufacturerOverride,
    onImporterOverride,
    onBack,
  }), [
    view, activeTemplate, design, customTemplates, selectedElementId, selectedElement,
    hoveredElementId, zoom, rightPanelTab, isGenerating, hasChanges, showMultiLabelDialog,
    showSaveDialog, saveTemplateName, saveTemplateDescription, saveMode, data, product,
    batches, variant, selectedBatchId, productSuppliers, manufacturerOverrideId,
    importerOverrideId, branding, hasCounterElement, history.canUndo, history.canRedo,
    autosave.status, updateDesign, addElement, updateElement, deleteElement,
    duplicateElement, moveElement, toggleSectionCollapsed, addFieldElement, addComplianceBadge,
    addCompliancePictogram, insertPictogram, handleSelectTemplate, handleNewBlank,
    handleDeleteTemplate, handleSaveTemplate, handleDirectSave, handleSaveAs, handleUndo,
    handleRedo, handleGeneratePDF, handleMultiLabelExport, reorderElement,
    moveElementToSection, reorderSections, handleCanvasDragOver, handleCanvasDrop,
    onVariantChange, onBatchChange, onManufacturerOverride, onImporterOverride, onBack,
  ]);

  return (
    <LabelEditorContext.Provider value={value}>
      {children}
    </LabelEditorContext.Provider>
  );
}
