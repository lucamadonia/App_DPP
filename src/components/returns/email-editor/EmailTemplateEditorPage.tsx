import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, RotateCcw, LayoutGrid, Blocks, Palette, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  getRhEmailTemplates, upsertRhEmailTemplate, seedDefaultEmailTemplates,
} from '@/services/supabase';
import type { RhEmailTemplate } from '@/types/returns-hub';
import type { EmailDesignConfig, WizardStep } from './emailEditorTypes';
import { getDefaultTemplate, getDefaultDesignConfig } from './emailTemplateDefaults';
import { renderEmailHtml } from './emailHtmlRenderer';
import { TemplateGallery } from './TemplateGallery';
import { BlockEditor } from './BlockEditor';
import { DesignSettingsPanel } from './DesignSettingsPanel';
import { TemplatePreview } from './TemplatePreview';

const WIZARD_STEPS: Array<{ key: WizardStep; icon: typeof LayoutGrid; label: string }> = [
  { key: 'gallery', icon: LayoutGrid, label: 'Templates' },
  { key: 'editor', icon: Blocks, label: 'Content' },
  { key: 'design', icon: Palette, label: 'Design' },
  { key: 'preview', icon: Eye, label: 'Preview' },
];

export function EmailTemplateEditorPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<RhEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Wizard state
  const [step, setStep] = useState<WizardStep>('gallery');
  const [editingTemplate, setEditingTemplate] = useState<RhEmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDesignConfig, setEditDesignConfig] = useState<EmailDesignConfig>(getDefaultDesignConfig());
  const [editPreviewText, setEditPreviewText] = useState('');
  const [editLocale, setEditLocale] = useState('en');
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const data = await getRhEmailTemplates();
    // If no templates, seed defaults first
    if (data.length === 0) {
      await seedDefaultEmailTemplates();
      const seeded = await getRhEmailTemplates();
      setTemplates(seeded);
    } else {
      setTemplates(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleEditTemplate = (tmpl: RhEmailTemplate) => {
    setEditingTemplate(tmpl);
    setEditSubject(tmpl.subjectTemplate);
    setEditPreviewText(tmpl.previewText || '');

    // Parse design config or use default for this event type
    const storedConfig = tmpl.designConfig as unknown as EmailDesignConfig;
    if (storedConfig?.blocks?.length > 0) {
      setEditDesignConfig(storedConfig);
    } else {
      const defaultTmpl = getDefaultTemplate(tmpl.eventType);
      setEditDesignConfig(defaultTmpl?.designConfig || getDefaultDesignConfig());
    }

    setEditLocale('en');
    setHasChanges(false);
    setStep('editor');
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

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);

    // Generate HTML from design config (default EN)
    const htmlTemplate = renderEmailHtml(editDesignConfig, editPreviewText);

    // Generate plain text body from blocks for backwards compatibility
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
  };

  const handleResetToDefault = () => {
    if (!editingTemplate) return;
    const defaultTmpl = getDefaultTemplate(editingTemplate.eventType);
    if (defaultTmpl) {
      setEditSubject(defaultTmpl.subjectTemplate);
      setEditDesignConfig(defaultTmpl.designConfig);
      setHasChanges(true);
    }
  };

  const handleDesignConfigChange = (config: EmailDesignConfig) => {
    setEditDesignConfig(config);
    setHasChanges(true);
  };

  const handleSubjectChange = (subject: string) => {
    setEditSubject(subject);
    setHasChanges(true);
  };

  const handleNavigateBack = () => {
    if (step === 'gallery') {
      if (hasChanges) {
        setShowUnsavedDialog(true);
        setPendingNavAction(() => () => navigate('/returns/settings'));
      } else {
        navigate('/returns/settings');
      }
    } else if (step === 'editor') {
      if (hasChanges) {
        setShowUnsavedDialog(true);
        setPendingNavAction(() => () => { setStep('gallery'); setEditingTemplate(null); setHasChanges(false); });
      } else {
        setStep('gallery');
        setEditingTemplate(null);
      }
    } else if (step === 'design') {
      setStep('editor');
    } else if (step === 'preview') {
      setStep('design');
    }
  };

  const handleStepClick = (targetStep: WizardStep) => {
    if (targetStep === 'gallery' && step !== 'gallery') {
      if (hasChanges) {
        setShowUnsavedDialog(true);
        setPendingNavAction(() => () => { setStep('gallery'); setEditingTemplate(null); setHasChanges(false); });
      } else {
        setStep('gallery');
        setEditingTemplate(null);
      }
    } else if (editingTemplate) {
      setStep(targetStep);
    }
  };

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.key === step);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('Email Template Editor')}</h1>
            <p className="text-sm text-muted-foreground">
              {editingTemplate
                ? t(editingTemplate.name || editingTemplate.eventType)
                : t('Manage your email templates')}
            </p>
          </div>
        </div>
        {editingTemplate && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleResetToDefault} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              {t('Reset')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t('Save')}
            </Button>
          </div>
        )}
      </div>

      {/* Step indicator */}
      {editingTemplate && (
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          {WIZARD_STEPS.map((ws, i) => (
            <button
              key={ws.key}
              onClick={() => handleStepClick(ws.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                i === stepIndex
                  ? 'bg-background text-foreground shadow-sm'
                  : i < stepIndex
                  ? 'text-primary hover:bg-background/50 cursor-pointer'
                  : 'text-muted-foreground cursor-pointer hover:bg-background/50'
              }`}
            >
              <ws.icon className="h-3.5 w-3.5" />
              {t(ws.label)}
            </button>
          ))}
        </div>
      )}

      {/* Step content */}
      <div className={step !== 'gallery' ? 'animate-slide-in-right' : ''}>
        {step === 'gallery' && (
          <TemplateGallery
            templates={templates}
            onEdit={handleEditTemplate}
            onToggleEnabled={handleToggleEnabled}
          />
        )}

        {step === 'editor' && editingTemplate && (
          <div className="max-w-3xl">
            <BlockEditor
              subject={editSubject}
              onSubjectChange={handleSubjectChange}
              designConfig={editDesignConfig}
              onDesignConfigChange={handleDesignConfigChange}
              eventType={editingTemplate.eventType}
              locale={editLocale}
              onLocaleChange={setEditLocale}
            />
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep('design')} className="gap-1.5">
                {t('Next')}: {t('Design')}
              </Button>
            </div>
          </div>
        )}

        {step === 'design' && editingTemplate && (
          <div className="max-w-2xl">
            <DesignSettingsPanel
              designConfig={editDesignConfig}
              onChange={handleDesignConfigChange}
            />
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('editor')} className="gap-1.5">
                {t('Back')}: {t('Content')}
              </Button>
              <Button onClick={() => setStep('preview')} className="gap-1.5">
                {t('Next')}: {t('Preview')}
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && editingTemplate && (
          <div className="max-w-3xl">
            <TemplatePreview
              designConfig={editDesignConfig}
              previewText={editPreviewText}
              eventType={editingTemplate.eventType}
              locale={editLocale}
              onLocaleChange={setEditLocale}
            />
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep('design')} className="gap-1.5">
                {t('Back')}: {t('Design')}
              </Button>
              <Button onClick={handleSave} disabled={saving || !hasChanges} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t('Save')}
              </Button>
            </div>
          </div>
        )}
      </div>

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
