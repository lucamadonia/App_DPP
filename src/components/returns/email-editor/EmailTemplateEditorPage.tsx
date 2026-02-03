import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, Settings2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  getRhEmailTemplates, upsertRhEmailTemplate, seedDefaultEmailTemplates,
} from '@/services/supabase';
import { useBranding } from '@/hooks/use-branding';
import type { RhEmailTemplate } from '@/types/returns-hub';
import type { EmailDesignConfig, EmailBlock, EmailBlockType, SettingsPanelTab } from './emailEditorTypes';
import { getDefaultTemplate, getDefaultDesignConfig } from './emailTemplateDefaults';
import { renderEmailHtml } from './emailHtmlRenderer';
import { TemplateGallery } from './TemplateGallery';
import { EditorToolbar } from './EditorToolbar';
import { EditorLayout } from './EditorLayout';
import { BlockInsertSidebar } from './BlockInsertSidebar';
import { BlockInsertHandle } from './BlockInsertHandle';
import { CanvasBlock } from './CanvasBlock';
import { BlockSettingsPanel } from './BlockSettingsPanel';
import { DesignSettingsPanel } from './DesignSettingsPanel';
import { LivePreview } from './LivePreview';
import { SubjectLineEditor } from './SubjectLineEditor';
import { VariableInserter } from './VariableInserter';
import { useEditorHistory } from './hooks/useEditorHistory';
import { useDragReorder } from './hooks/useDragReorder';
import { useAutosave } from './hooks/useAutosave';

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createDefaultBlock(type: EmailBlockType): EmailBlock {
  const id = makeId();
  switch (type) {
    case 'text':
      return { type: 'text', id, content: 'New text block' };
    case 'button':
      return { type: 'button', id, text: 'Click Here', url: '#', alignment: 'center', backgroundColor: '#3b82f6', textColor: '#ffffff', borderRadius: 6 };
    case 'divider':
      return { type: 'divider', id, color: '#e5e7eb', thickness: 1 };
    case 'spacer':
      return { type: 'spacer', id, height: 16 };
    case 'info-box':
      return { type: 'info-box', id, label: 'Label', value: 'Value', backgroundColor: '#f0f9ff', borderColor: '#3b82f6' };
    case 'image':
      return { type: 'image', id, src: '', alt: '', width: 400, alignment: 'center', linkUrl: '', borderRadius: 0 };
    case 'social-links':
      return { type: 'social-links', id, alignment: 'center', iconSize: 32, iconStyle: 'colored', links: [{ platform: 'facebook', url: '' }, { platform: 'twitter', url: '' }, { platform: 'instagram', url: '' }] };
    case 'columns':
      return { type: 'columns', id, columnCount: 2, columns: [{ blocks: [] }, { blocks: [] }, { blocks: [] }], gap: 16 };
    case 'hero':
      return { type: 'hero', id, backgroundImage: '', backgroundColor: '#1e293b', overlayOpacity: 0.3, minHeight: 200, title: 'Hero Title', subtitle: 'Subtitle text', titleColor: '#ffffff', subtitleColor: '#e2e8f0', ctaText: 'Learn More', ctaUrl: '#', ctaBackgroundColor: '#3b82f6', ctaTextColor: '#ffffff', ctaBorderRadius: 6, alignment: 'center' };
  }
}

export function EmailTemplateEditorPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const { branding } = useBranding();

  const [templates, setTemplates] = useState<RhEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Design panel focus (for canvas header/footer click)
  const [designFocusSection, setDesignFocusSection] = useState<'header' | 'footer' | null>(null);

  // Editor state
  const [editingTemplate, setEditingTemplate] = useState<RhEmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDesignConfig, setEditDesignConfig] = useState<EmailDesignConfig>(getDefaultDesignConfig());
  const [editPreviewText, setEditPreviewText] = useState('');
  const [editLocale, setEditLocale] = useState('en');
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);

  // Split-pane editor state
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<SettingsPanelTab>('preview');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');

  // Change counter to trigger autosave
  const changeCounterRef = useRef(0);
  const [changeCounter, setChangeCounter] = useState(0);

  // Hooks
  const history = useEditorHistory(editDesignConfig, editSubject);

  const isLocale = editLocale !== 'en';
  const localeContent = isLocale ? editDesignConfig.locales?.[editLocale] : undefined;
  const blocks = localeContent?.blocks || editDesignConfig.blocks;
  const currentSubject = (isLocale && localeContent?.subjectTemplate) || editSubject;

  const dragReorder = useDragReorder(blocks.length);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    let data = await getRhEmailTemplates();
    if (data.length < 15) {
      await seedDefaultEmailTemplates();
      data = await getRhEmailTemplates();
    }
    setTemplates(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Save function for autosave
  const handleSave = useCallback(async () => {
    if (!editingTemplate) return;
    setSaving(true);

    const htmlTemplate = renderEmailHtml(editDesignConfig, editPreviewText);
    const bodyText = editDesignConfig.blocks
      .filter((b) => b.type === 'text')
      .map((b) => (b as { content: string }).content)
      .join('\n\n');

    await upsertRhEmailTemplate({
      eventType: editingTemplate.eventType,
      enabled: editingTemplate.enabled,
      subjectTemplate: editSubject,
      bodyTemplate: bodyText,
      designConfig: editDesignConfig as unknown as Record<string, unknown>,
      htmlTemplate,
      previewText: editPreviewText,
      name: editingTemplate.name,
      description: editingTemplate.description,
      category: editingTemplate.category,
      sortOrder: editingTemplate.sortOrder,
    });

    await loadTemplates();
    setHasChanges(false);
    setSaving(false);
  }, [editingTemplate, editDesignConfig, editPreviewText, editSubject, loadTemplates]);

  const autosave = useAutosave(handleSave, changeCounter > 0 && hasChanges);

  // Block operations
  const updateBlocks = useCallback((newBlocks: EmailBlock[]) => {
    if (isLocale) {
      const updatedLocales = { ...editDesignConfig.locales };
      updatedLocales[editLocale] = { ...updatedLocales[editLocale], blocks: newBlocks };
      const newConfig = { ...editDesignConfig, locales: updatedLocales };
      setEditDesignConfig(newConfig);
      history.push(newConfig, editSubject);
    } else {
      const newConfig = { ...editDesignConfig, blocks: newBlocks };
      setEditDesignConfig(newConfig);
      history.push(newConfig, editSubject);
    }
    setHasChanges(true);
    changeCounterRef.current += 1;
    setChangeCounter(changeCounterRef.current);
  }, [isLocale, editLocale, editDesignConfig, editSubject, history]);

  const handleAddBlock = useCallback((blockType: EmailBlockType, atIndex?: number) => {
    const block = createDefaultBlock(blockType);
    const newBlocks = [...blocks];
    if (atIndex !== undefined) {
      newBlocks.splice(atIndex, 0, block);
    } else {
      newBlocks.push(block);
    }
    updateBlocks(newBlocks);
    const idx = atIndex !== undefined ? atIndex : newBlocks.length - 1;
    setSelectedBlockIndex(idx);
    setRightPanelTab('block-settings');
  }, [blocks, updateBlocks]);

  const handleUpdateBlock = useCallback((index: number, block: EmailBlock) => {
    const newBlocks = [...blocks];
    newBlocks[index] = block;
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  const handleDeleteBlock = useCallback((index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    updateBlocks(newBlocks);
    setSelectedBlockIndex(null);
    if (newBlocks.length === 0) setRightPanelTab('preview');
  }, [blocks, updateBlocks]);

  const handleDuplicateBlock = useCallback((index: number) => {
    const original = blocks[index];
    const duplicate = { ...original, id: makeId() };
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicate);
    updateBlocks(newBlocks);
    setSelectedBlockIndex(index + 1);
  }, [blocks, updateBlocks]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newBlocks = [...blocks];
    [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
    updateBlocks(newBlocks);
    setSelectedBlockIndex(index - 1);
  }, [blocks, updateBlocks]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === blocks.length - 1) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    updateBlocks(newBlocks);
    setSelectedBlockIndex(index + 1);
  }, [blocks, updateBlocks]);

  const handleDesignConfigChange = useCallback((config: EmailDesignConfig) => {
    setEditDesignConfig(config);
    history.push(config, editSubject);
    setHasChanges(true);
    changeCounterRef.current += 1;
    setChangeCounter(changeCounterRef.current);
  }, [editSubject, history]);

  const handleSubjectChange = useCallback((subject: string) => {
    if (isLocale) {
      const updatedLocales = { ...editDesignConfig.locales };
      updatedLocales[editLocale] = { ...updatedLocales[editLocale], subjectTemplate: subject };
      const newConfig = { ...editDesignConfig, locales: updatedLocales };
      setEditDesignConfig(newConfig);
      history.push(newConfig, editSubject);
    } else {
      setEditSubject(subject);
      history.push(editDesignConfig, subject);
    }
    setHasChanges(true);
    changeCounterRef.current += 1;
    setChangeCounter(changeCounterRef.current);
  }, [isLocale, editLocale, editDesignConfig, editSubject, history]);

  const handleInsertVariable = useCallback((variable: string) => {
    if (selectedBlockIndex === null) return;
    const block = blocks[selectedBlockIndex];
    if (block.type === 'text') {
      handleUpdateBlock(selectedBlockIndex, { ...block, content: block.content + variable });
    } else if (block.type === 'info-box') {
      handleUpdateBlock(selectedBlockIndex, { ...block, value: block.value + variable });
    } else if (block.type === 'button') {
      handleUpdateBlock(selectedBlockIndex, { ...block, text: block.text + variable });
    }
  }, [selectedBlockIndex, blocks, handleUpdateBlock]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (entry) {
      setEditDesignConfig(entry.designConfig);
      setEditSubject(entry.subject);
      setHasChanges(true);
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (entry) {
      setEditDesignConfig(entry.designConfig);
      setEditSubject(entry.subject);
      setHasChanges(true);
    }
  }, [history]);

  // Reset
  const handleResetToDefault = useCallback(() => {
    if (!editingTemplate) return;
    const defaultTmpl = getDefaultTemplate(editingTemplate.eventType);
    if (defaultTmpl) {
      setEditSubject(defaultTmpl.subjectTemplate);
      setEditDesignConfig(defaultTmpl.designConfig);
      history.reset(defaultTmpl.designConfig, defaultTmpl.subjectTemplate);
      setHasChanges(true);
      changeCounterRef.current += 1;
      setChangeCounter(changeCounterRef.current);
    }
  }, [editingTemplate, history]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!editingTemplate) return;

    const handler = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (isCmd && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (isCmd && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (isCmd && e.key === 'd' && selectedBlockIndex !== null) {
        e.preventDefault();
        handleDuplicateBlock(selectedBlockIndex);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockIndex !== null) {
        // Only if not focused on an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          handleDeleteBlock(selectedBlockIndex);
        }
      } else if (e.key === 'Escape') {
        setSelectedBlockIndex(null);
        setRightPanelTab('preview');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editingTemplate, selectedBlockIndex, handleUndo, handleRedo, handleSave, handleDuplicateBlock, handleDeleteBlock]);

  // Template editing
  const handleEditTemplate = (tmpl: RhEmailTemplate) => {
    setEditingTemplate(tmpl);
    setEditSubject(tmpl.subjectTemplate);
    setEditPreviewText(tmpl.previewText || '');

    const storedConfig = tmpl.designConfig as unknown as EmailDesignConfig;
    let config = storedConfig?.blocks?.length > 0
      ? storedConfig
      : (getDefaultTemplate(tmpl.eventType)?.designConfig || getDefaultDesignConfig());

    // Auto-apply corporate design for empty/default values
    let brandingApplied = false;
    if (branding.logo && config.header.showLogo && !config.header.logoUrl) {
      config = { ...config, header: { ...config.header, logoUrl: branding.logo } };
      brandingApplied = true;
    }
    if (branding.primaryColor) {
      // Apply to header background if still default
      if (config.header.backgroundColor === '#1e293b') {
        config = { ...config, header: { ...config.header, backgroundColor: branding.primaryColor } };
        brandingApplied = true;
      }
      // Apply to default-colored button blocks
      const updatedBlocks = config.blocks.map((block) => {
        if (block.type === 'button' && block.backgroundColor === '#3b82f6') {
          brandingApplied = true;
          return { ...block, backgroundColor: branding.primaryColor };
        }
        if (block.type === 'hero' && block.ctaBackgroundColor === '#3b82f6') {
          brandingApplied = true;
          return { ...block, ctaBackgroundColor: branding.primaryColor };
        }
        return block;
      });
      if (brandingApplied) {
        config = { ...config, blocks: updatedBlocks };
      }
    }

    setEditDesignConfig(config);
    history.reset(config, tmpl.subjectTemplate);

    setEditLocale('en');
    setHasChanges(brandingApplied);
    setSelectedBlockIndex(null);
    setRightPanelTab('preview');
    setViewportMode('desktop');
    setDesignFocusSection(null);
    changeCounterRef.current = brandingApplied ? 1 : 0;
    setChangeCounter(changeCounterRef.current);
  };

  const handleToggleEnabled = async (tmpl: RhEmailTemplate, enabled: boolean) => {
    await upsertRhEmailTemplate({
      eventType: tmpl.eventType,
      enabled,
      subjectTemplate: tmpl.subjectTemplate,
      bodyTemplate: tmpl.bodyTemplate,
    });
    await loadTemplates();
  };

  const handleNavigateBack = () => {
    if (!editingTemplate) {
      navigate('/returns/settings');
    } else if (hasChanges) {
      setShowUnsavedDialog(true);
      setPendingNavAction(() => () => {
        setEditingTemplate(null);
        setHasChanges(false);
        setSelectedBlockIndex(null);
      });
    } else {
      setEditingTemplate(null);
      setSelectedBlockIndex(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Gallery view (no template being edited)
  if (!editingTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/returns/settings')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('Email Template Editor')}</h1>
            <p className="text-sm text-muted-foreground">{t('Manage your email templates')}</p>
          </div>
        </div>
        <TemplateGallery
          templates={templates}
          onEdit={handleEditTemplate}
          onToggleEnabled={handleToggleEnabled}
        />
      </div>
    );
  }

  // Split-pane editor view
  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      {/* Glassmorphism toolbar */}
      <EditorToolbar
        templateName={editingTemplate.name || editingTemplate.eventType}
        locale={editLocale}
        onLocaleChange={setEditLocale}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onReset={handleResetToDefault}
        onBack={handleNavigateBack}
        saving={saving}
        saveStatus={autosave.status}
        viewportMode={viewportMode}
        onViewportChange={setViewportMode}
      />

      {/* Split-pane layout */}
      <EditorLayout
        sidebar={
          <BlockInsertSidebar
            onDragStart={dragReorder.handleSidebarDragStart}
            onAddBlock={(type) => handleAddBlock(type)}
          />
        }
        canvas={
          <div className="w-full max-w-[600px]">
            {/* Subject line */}
            <div className="bg-background rounded-lg border p-4 mb-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{t('Email Body')} ({editLocale.toUpperCase()})</span>
                <VariableInserter eventType={editingTemplate.eventType} onInsert={handleInsertVariable} />
              </div>
              <SubjectLineEditor
                value={currentSubject}
                onChange={handleSubjectChange}
                eventType={editingTemplate.eventType}
              />
            </div>

            {/* Canvas Header Section */}
            {editDesignConfig.header.enabled && (
              <div
                className="bg-background rounded-t-lg border border-b-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group/header"
                onClick={() => {
                  setRightPanelTab('design-settings');
                  setDesignFocusSection('header');
                }}
              >
                <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/30 rounded-t-lg">
                  <span className="text-[10px] font-medium text-muted-foreground">{t('Header')}</span>
                  <Settings2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/header:opacity-100 transition-opacity" />
                </div>
                <div
                  className="px-4 py-3 flex items-center"
                  style={{
                    backgroundColor: editDesignConfig.header.backgroundColor,
                    justifyContent: editDesignConfig.header.alignment === 'center' ? 'center' : editDesignConfig.header.alignment === 'right' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {editDesignConfig.header.showLogo && editDesignConfig.header.logoUrl ? (
                    <img
                      src={editDesignConfig.header.logoUrl}
                      alt="Logo"
                      className="object-contain"
                      style={{ height: Math.min(editDesignConfig.header.logoHeight, 50) }}
                    />
                  ) : editDesignConfig.header.showLogo ? (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: editDesignConfig.header.textColor }}>
                      <ImageIcon className="h-4 w-4 opacity-50" />
                      <span className="opacity-60">{t('No logo set')}</span>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: editDesignConfig.header.textColor }}>
                      {t('Header')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Blocks canvas */}
            <div className={`bg-background border shadow-sm overflow-hidden ${editDesignConfig.header.enabled ? 'border-t-0' : 'rounded-t-lg'} ${editDesignConfig.footer.enabled ? 'border-b-0' : 'rounded-b-lg'}`}>
              {blocks.length === 0 ? (
                <div
                  className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-lg m-4"
                  onDragOver={(e) => {
                    e.preventDefault();
                    dragReorder.handleDragOver(0);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData('text/plain');
                    if (data && !data.startsWith('reorder:')) {
                      handleAddBlock(data as EmailBlockType, 0);
                    }
                    dragReorder.handleDragEnd();
                  }}
                >
                  <p className="text-sm">{t('Add blocks to build your email')}</p>
                  <p className="text-xs mt-1">{t('Drag to reorder')}</p>
                </div>
              ) : (
                <div className="p-4 space-y-0">
                  {/* Insert handle before first block */}
                  <BlockInsertHandle
                    onInsert={(type) => handleAddBlock(type, 0)}
                    onDragOver={() => dragReorder.handleDragOver(0)}
                    showDropZone={dragReorder.dragState.isDragging && dragReorder.dragState.targetIndex === 0}
                  />

                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dragReorder.handleDragOver(index + 1);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const data = e.dataTransfer.getData('text/plain');
                        if (data.startsWith('reorder:')) {
                          const fromIndex = parseInt(data.split(':')[1]);
                          const newBlocks = [...blocks];
                          const [moved] = newBlocks.splice(fromIndex, 1);
                          const toIndex = index > fromIndex ? index : index + 1;
                          newBlocks.splice(toIndex > newBlocks.length ? newBlocks.length : toIndex, 0, moved);
                          updateBlocks(newBlocks);
                          setSelectedBlockIndex(toIndex > newBlocks.length ? newBlocks.length - 1 : toIndex);
                        } else if (data) {
                          handleAddBlock(data as EmailBlockType, index + 1);
                        }
                        dragReorder.handleDragEnd();
                      }}
                    >
                      <CanvasBlock
                        block={block}
                        index={index}
                        isSelected={selectedBlockIndex === index}
                        isFirst={index === 0}
                        isLast={index === blocks.length - 1}
                        isDragSource={dragReorder.dragState.sourceIndex === index}
                        onSelect={() => {
                          setSelectedBlockIndex(selectedBlockIndex === index ? null : index);
                          setRightPanelTab(selectedBlockIndex === index ? 'preview' : 'block-settings');
                        }}
                        onMoveUp={() => handleMoveUp(index)}
                        onMoveDown={() => handleMoveDown(index)}
                        onDuplicate={() => handleDuplicateBlock(index)}
                        onDelete={() => handleDeleteBlock(index)}
                        onDragStart={() => dragReorder.handleDragStart(index)}
                      />

                      {/* Insert handle after each block */}
                      <BlockInsertHandle
                        onInsert={(type) => handleAddBlock(type, index + 1)}
                        onDragOver={() => dragReorder.handleDragOver(index + 1)}
                        showDropZone={dragReorder.dragState.isDragging && dragReorder.dragState.targetIndex === index + 1}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Canvas Footer Section */}
            {editDesignConfig.footer.enabled && (
              <div
                className="bg-background rounded-b-lg border border-t-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group/footer"
                onClick={() => {
                  setRightPanelTab('design-settings');
                  setDesignFocusSection('footer');
                }}
              >
                <div
                  className="px-4 py-3 rounded-b-lg"
                  style={{ backgroundColor: editDesignConfig.footer.backgroundColor }}
                >
                  <p className="text-xs text-center" style={{ color: editDesignConfig.footer.textColor }}>
                    {editDesignConfig.footer.text || t('Footer Text')}
                  </p>
                </div>
                <div className="flex items-center justify-between px-3 py-1 border-t bg-muted/30 rounded-b-lg">
                  <span className="text-[10px] font-medium text-muted-foreground">{t('Footer')}</span>
                  <Settings2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/footer:opacity-100 transition-opacity" />
                </div>
              </div>
            )}
          </div>
        }
        rightPane={
          <div>
            {/* Tab switcher */}
            <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30">
              <button
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  rightPanelTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                }`}
                onClick={() => setRightPanelTab('preview')}
              >
                {t('Preview')}
              </button>
              <button
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  rightPanelTab === 'block-settings' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                }`}
                onClick={() => setRightPanelTab('block-settings')}
                disabled={!selectedBlock}
              >
                {t('Block Settings')}
              </button>
              <button
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  rightPanelTab === 'design-settings' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
                }`}
                onClick={() => setRightPanelTab('design-settings')}
              >
                {t('Design')}
              </button>
            </div>

            {/* Panel content */}
            {rightPanelTab === 'preview' && (
              <LivePreview
                designConfig={editDesignConfig}
                previewText={editPreviewText}
                eventType={editingTemplate.eventType}
                locale={editLocale}
                viewportMode={viewportMode}
              />
            )}

            {rightPanelTab === 'block-settings' && selectedBlock && (
              <BlockSettingsPanel
                block={selectedBlock}
                onChange={(b) => handleUpdateBlock(selectedBlockIndex!, b)}
              />
            )}

            {rightPanelTab === 'block-settings' && !selectedBlock && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t('Click a block to edit its settings')}
              </div>
            )}

            {rightPanelTab === 'design-settings' && (
              <div className="p-4 animate-panel-slide-in">
                <DesignSettingsPanel
                  designConfig={editDesignConfig}
                  onChange={handleDesignConfigChange}
                  focusSection={designFocusSection}
                  onFocusSectionHandled={() => setDesignFocusSection(null)}
                  brandingLogo={branding.logo}
                  brandingPrimaryColor={branding.primaryColor}
                />
              </div>
            )}
          </div>
        }
      />

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Unsaved Changes')}</DialogTitle>
            <DialogDescription>
              {t('You have unsaved changes. Do you want to discard them?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowUnsavedDialog(false);
                if (pendingNavAction) {
                  pendingNavAction();
                  setPendingNavAction(null);
                }
              }}
            >
              {t('Discard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
