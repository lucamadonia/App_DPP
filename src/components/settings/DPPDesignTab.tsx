/**
 * DPP Design Settings Tab
 *
 * Full settings UI for customizing the public DPP page design.
 * Includes theme presets, color palette, typography, hero, cards,
 * section layout, footer configuration, and live preview.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Save,
  Check,
  Loader2,
  ChevronUp,
  ChevronDown,
  Upload,
  RotateCcw,
  Package,
  Leaf,
  Recycle,
  Award,
  Truck,
  HelpCircle,
  Settings2,
  Columns2,
  PanelLeft,
  AlignLeft,
  AlignCenter,
  Type,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranding } from '@/contexts/BrandingContext';
import { uploadHeroImage } from '@/services/supabase';
import type {
  DPPDesignSettings,
  DPPSectionId,
  DPPFontFamily,
  DPPFontSize,
  DPPFontWeight,
  DPPHeroStyle,
  DPPHeroHeight,
  DPPBorderRadius,
  DPPShadowDepth,
  DPPBorderStyle,
  DPPTemplateName,
  DPPCustomLayoutMode,
  DPPCustomSectionStyle,
  DPPCustomHeaderStyle,
} from '@/types/database';
import {
  DPP_THEME_PRESETS,
  BORDER_RADIUS_MAP,
  SHADOW_MAP,
  FONT_FAMILY_MAP,
  HEADING_FONT_SIZE_MAP,
  BODY_FONT_SIZE_MAP,
  FONT_WEIGHT_MAP,
} from '@/lib/dpp-design-defaults';
import { resolveDesign, getCardStyle, getHeroStyle, getHeadingStyle } from '@/lib/dpp-design-utils';

const SECTION_LABELS: Record<DPPSectionId, { icon: React.ReactNode; labelKey: string }> = {
  materials: { icon: <Package className="h-4 w-4" />, labelKey: 'Materials' },
  packaging: { icon: <Package className="h-4 w-4" />, labelKey: 'Packaging' },
  carbonFootprint: { icon: <Leaf className="h-4 w-4" />, labelKey: 'Carbon Footprint' },
  recycling: { icon: <Recycle className="h-4 w-4" />, labelKey: 'Recycling' },
  certifications: { icon: <Award className="h-4 w-4" />, labelKey: 'Certifications' },
  supplyChain: { icon: <Truck className="h-4 w-4" />, labelKey: 'Supply Chain' },
  support: { icon: <HelpCircle className="h-4 w-4" />, labelKey: 'Support' },
  components: { icon: <Package className="h-4 w-4" />, labelKey: 'Components' },
};

const TEMPLATE_OPTIONS: { value: DPPTemplateName; labelKey: string; descKey: string }[] = [
  { value: 'modern', labelKey: 'Modern', descKey: 'Hero header, glassmorphism cards, animations' },
  { value: 'classic', labelKey: 'Classic', descKey: 'Clean cards, structured sections, professional' },
  { value: 'compact', labelKey: 'Compact', descKey: 'Tab layout, mobile-first, minimal whitespace' },
  { value: 'minimal', labelKey: 'Minimal', descKey: 'Ultra-clean, whitespace-heavy, large typography' },
  { value: 'technical', labelKey: 'Technical', descKey: 'Data-dense, monospace accents, engineer-focused' },
  { value: 'eco-friendly', labelKey: 'Eco-Friendly', descKey: 'Green tones, sustainability metrics prominent' },
  { value: 'premium', labelKey: 'Premium', descKey: 'Dark theme, gold accents, luxury feel' },
  { value: 'government', labelKey: 'Government', descKey: 'Formal layout, document-style, reference numbers' },
  { value: 'retail', labelKey: 'Retail', descKey: 'Consumer-friendly, large images, colorful badges' },
  { value: 'scientific', labelKey: 'Scientific', descKey: 'Data visualization, academic structure' },
  { value: 'accessible', labelKey: 'Accessible', descKey: 'WCAG AAA, extra-large text, high contrast' },
  { value: 'custom', labelKey: 'Custom', descKey: 'Fully configurable layout, section styles and headers' },
];

function TemplateMiniPreview({ template }: { template: DPPTemplateName }) {
  const base = 'w-full h-[100px] rounded-md overflow-hidden relative';

  switch (template) {
    case 'modern':
      return (
        <div className={base} style={{ background: '#f8fafc' }}>
          <div style={{ height: 28, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '0 0 6px 6px' }} />
          <div className="px-2 pt-2 space-y-1.5">
            {['#3b82f6', '#8b5cf6', '#6366f1'].map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <div style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: c, flexShrink: 0 }} />
                <div style={{ height: 14, borderRadius: 6, backgroundColor: '#e2e8f0', flex: 1 }} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'classic':
      return (
        <div className={base} style={{ background: '#fafafa' }}>
          <div style={{ height: 2, backgroundColor: '#94a3b8', margin: '8px 8px 0' }} />
          <div className="px-2 pt-2 space-y-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 18, border: '1px solid #cbd5e1', borderRadius: 3 }} />
            ))}
          </div>
          <div style={{ height: 1, backgroundColor: '#e2e8f0', margin: '6px 8px 0' }} />
        </div>
      );

    case 'compact':
      return (
        <div className={base} style={{ background: '#f8fafc' }}>
          <div className="flex gap-1 px-2 pt-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, backgroundColor: i === 0 ? '#3b82f6' : '#cbd5e1' }} />
            ))}
          </div>
          <div className="px-2 pt-2 space-y-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-1">
                <div style={{ height: 8, flex: 2, backgroundColor: '#e2e8f0', borderRadius: 2 }} />
                <div style={{ height: 8, flex: 3, backgroundColor: '#f1f5f9', borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'minimal':
      return (
        <div className={base} style={{ background: '#ffffff' }}>
          <div className="flex flex-col items-center pt-5 px-3">
            <div style={{ width: '60%', height: 10, backgroundColor: '#1e293b', borderRadius: 2, marginBottom: 12 }} />
            <div style={{ width: '80%', height: 1, backgroundColor: '#e2e8f0', marginBottom: 10 }} />
            <div style={{ width: '50%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 2, marginBottom: 10 }} />
            <div style={{ width: '80%', height: 1, backgroundColor: '#e2e8f0', marginBottom: 10 }} />
            <div style={{ width: '40%', height: 6, backgroundColor: '#f1f5f9', borderRadius: 2 }} />
          </div>
        </div>
      );

    case 'technical':
      return (
        <div className={base} style={{ background: '#f1f5f9' }}>
          <div style={{ height: 22, backgroundColor: '#111827', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 3 }}>
            <div style={{ width: 16, height: 4, backgroundColor: '#6ee7b7', borderRadius: 1 }} />
            <div style={{ width: 24, height: 4, backgroundColor: '#4b5563', borderRadius: 1 }} />
          </div>
          <div className="px-2 pt-1.5" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 3, width: 3, borderRadius: '50%', backgroundColor: '#94a3b8' }} />
            ))}
          </div>
          <div className="px-2 pt-1 space-y-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex gap-1">
                <div style={{ width: 20, height: 8, backgroundColor: '#e2e8f0', borderRadius: 2, fontFamily: 'monospace' }} />
                <div style={{ height: 8, flex: 1, backgroundColor: '#f8fafc', borderRadius: 2 }} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'eco-friendly':
      return (
        <div className={base} style={{ background: '#f0fdf4' }}>
          <div style={{ height: 26, background: 'linear-gradient(135deg, #16a34a, #22c55e)', borderRadius: '0 0 6px 6px', position: 'relative' }}>
            <div style={{ position: 'absolute', right: 6, top: 5, width: 14, height: 14, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.25)' }} />
          </div>
          <div className="px-2 pt-2 space-y-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 16, backgroundColor: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 4 }} />
            ))}
          </div>
        </div>
      );

    case 'premium':
      return (
        <div className={base} style={{ background: '#030712' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #d97706, #f59e0b)', margin: '10px 8px 0' }} />
          <div style={{ width: '50%', height: 8, backgroundColor: '#1f2937', borderRadius: 2, margin: '8px auto 0' }} />
          <div className="px-3 pt-2 space-y-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 14, backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: 3 }} />
            ))}
          </div>
        </div>
      );

    case 'government':
      return (
        <div className={base} style={{ background: '#ffffff' }}>
          <div style={{ height: 3, backgroundColor: '#1e3a5f', margin: '6px 6px 0' }} />
          <div className="px-2 pt-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ height: 22, border: '1px solid #cbd5e1', borderRadius: 2 }} />
            ))}
          </div>
          <div style={{ height: 3, backgroundColor: '#1e3a5f', margin: '6px 6px 0' }} />
        </div>
      );

    case 'retail':
      return (
        <div className={base} style={{ background: '#fafafa' }}>
          <div className="flex gap-2 p-2">
            <div style={{ width: 36, height: 36, backgroundColor: '#e2e8f0', borderRadius: 8, flexShrink: 0 }} />
            <div className="flex-1 pt-1 space-y-1">
              <div style={{ height: 6, width: '70%', backgroundColor: '#334155', borderRadius: 2 }} />
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: i < 4 ? '#facc15' : '#e2e8f0' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-1 px-2">
            {['#3b82f6', '#10b981', '#f59e0b'].map((c, i) => (
              <div key={i} style={{ height: 10, flex: 1, backgroundColor: c, borderRadius: 4, opacity: 0.8 }} />
            ))}
          </div>
          <div className="px-2 pt-1.5 space-y-1">
            {[0, 1].map(i => (
              <div key={i} style={{ height: 12, backgroundColor: '#f1f5f9', borderRadius: 4 }} />
            ))}
          </div>
        </div>
      );

    case 'scientific':
      return (
        <div className={base} style={{ background: '#ffffff' }}>
          <div className="px-2 pt-2 space-y-1.5">
            {['1.', '2.', '3.'].map((num, i) => (
              <div key={i}>
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: 7, fontWeight: 700, color: '#64748b', lineHeight: 1, flexShrink: 0 }}>{num}</span>
                  <div style={{ height: 6, flex: 1, backgroundColor: '#e2e8f0', borderRadius: 2 }} />
                </div>
                <div style={{ height: 1, backgroundColor: '#f1f5f9', marginTop: 4, marginLeft: 12 }} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'accessible':
      return (
        <div className={base} style={{ background: '#ffffff', border: '3px solid #000000' }}>
          <div className="px-2 pt-2 space-y-2">
            <div style={{ height: 10, width: '70%', backgroundColor: '#000000', borderRadius: 2 }} />
            <div style={{ height: 8, width: '90%', backgroundColor: '#374151', borderRadius: 2 }} />
            <div style={{ height: 8, width: '80%', backgroundColor: '#374151', borderRadius: 2 }} />
            <div style={{ height: 8, width: '60%', backgroundColor: '#374151', borderRadius: 2 }} />
          </div>
        </div>
      );

    case 'custom':
      return (
        <div className={base} style={{ background: '#f8fafc' }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Settings2 className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <div className="px-3 space-y-1">
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ height: 10, border: '1.5px dashed #94a3b8', borderRadius: 4, width: 60 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return <div className={base} style={{ background: '#f1f5f9' }} />;
  }
}

export function DPPDesignTab() {
  const { t } = useTranslation('settings');
  const { rawDPPDesign, updateDPPDesign, branding, qrCodeSettings, updateQRCodeSettings } = useBranding();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [templateCustomer, setTemplateCustomer] = useState<DPPTemplateName>(qrCodeSettings.dppTemplateCustomer);
  const [templateCustoms, setTemplateCustoms] = useState<DPPTemplateName>(qrCodeSettings.dppTemplateCustoms);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const handleSaveTemplates = async () => {
    setIsSavingTemplate(true);
    try {
      await updateQRCodeSettings({
        dppTemplateCustomer: templateCustomer,
        dppTemplateCustoms: templateCustoms,
      });
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch (e) {
      console.error('Error saving template settings:', e);
    }
    setIsSavingTemplate(false);
  };

  const [designForm, setDesignForm] = useState<DPPDesignSettings>(() => {
    return rawDPPDesign || {};
  });

  useEffect(() => {
    if (rawDPPDesign) {
      setDesignForm(rawDPPDesign);
    }
  }, [rawDPPDesign]);

  const resolved = resolveDesign(designForm);
  const primaryColor = branding.primaryColor;

  const updateColors = (key: string, value: string) => {
    setDesignForm(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateTypography = (key: string, value: string) => {
    setDesignForm(prev => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }));
  };

  const updateHero = (key: string, value: unknown) => {
    setDesignForm(prev => ({
      ...prev,
      hero: { ...prev.hero, [key]: value },
    }));
  };

  const updateCards = (key: string, value: unknown) => {
    setDesignForm(prev => ({
      ...prev,
      cards: { ...prev.cards, [key]: value },
    }));
  };

  const updateFooter = (key: string, value: unknown) => {
    setDesignForm(prev => ({
      ...prev,
      footer: { ...prev.footer, [key]: value },
    }));
  };

  const updateCustomLayout = (key: string, value: unknown) => {
    setDesignForm(prev => ({
      ...prev,
      customLayout: { ...prev.customLayout, [key]: value },
    }));
  };

  const updateSocialLink = (key: string, value: string) => {
    setDesignForm(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        socialLinks: { ...prev.footer?.socialLinks, [key]: value },
      },
    }));
  };

  const updateSectionOrder = (order: DPPSectionId[]) => {
    setDesignForm(prev => ({
      ...prev,
      sections: { ...prev.sections, order },
    }));
  };

  const updateSectionConfig = (id: DPPSectionId, key: string, value: boolean) => {
    setDesignForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        configs: {
          ...prev.sections?.configs,
          [id]: { ...prev.sections?.configs?.[id], [key]: value },
        },
      },
    }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = DPP_THEME_PRESETS[presetKey];
    if (!preset) return;
    setDesignForm(prev => ({
      ...prev,
      ...preset.settings,
      preset: presetKey,
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const order = [...resolved.sections.order];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= order.length) return;
    [order[index], order[newIndex]] = [order[newIndex], order[index]];
    updateSectionOrder(order);
  };

  const handleHeroUpload = async (file: File) => {
    setIsUploadingHero(true);
    const result = await uploadHeroImage(file);
    if (result.success && result.url) {
      updateHero('backgroundImage', result.url);
      updateHero('style', 'image');
    }
    setIsUploadingHero(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    setSaveError(false);
    const success = await updateDPPDesign(designForm);
    setIsSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 0. Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('DPP Page Template')}</CardTitle>
          <CardDescription>{t('Choose different templates for customer and customs views')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Customer Template */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('Customer Template')}</Label>
              <p className="text-xs text-muted-foreground">{t('Template shown to consumers scanning the QR code')}</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {TEMPLATE_OPTIONS.map((tmpl) => (
                  <button
                    key={tmpl.value}
                    onClick={() => setTemplateCustomer(tmpl.value)}
                    className={`rounded-lg border-2 text-left transition-all text-sm overflow-hidden ${
                      templateCustomer === tmpl.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="p-1.5 pb-0">
                      <TemplateMiniPreview template={tmpl.value} />
                    </div>
                    <div className="p-2 pt-1.5">
                      <p className="font-medium">{t(tmpl.labelKey, { ns: 'dpp' })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t(tmpl.descKey, { ns: 'dpp' })}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Customs Template */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('Customs Template')}</Label>
              <p className="text-xs text-muted-foreground">{t('Template shown to customs authorities')}</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {TEMPLATE_OPTIONS.map((tmpl) => (
                  <button
                    key={tmpl.value}
                    onClick={() => setTemplateCustoms(tmpl.value)}
                    className={`rounded-lg border-2 text-left transition-all text-sm overflow-hidden ${
                      templateCustoms === tmpl.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="p-1.5 pb-0">
                      <TemplateMiniPreview template={tmpl.value} />
                    </div>
                    <div className="p-2 pt-1.5">
                      <p className="font-medium">{t(tmpl.labelKey, { ns: 'dpp' })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t(tmpl.descKey, { ns: 'dpp' })}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveTemplates} disabled={isSavingTemplate}>
              {isSavingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : templateSaved ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {templateSaved ? t('Saved!') : t('Save Templates')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 0b. Custom Layout Settings (visible only when custom template is selected) */}
      {(templateCustomer === 'custom' || templateCustoms === 'custom') && (
        <Card>
          <CardHeader>
            <CardTitle>{t('Custom Layout')}</CardTitle>
            <CardDescription>{t('Configure the layout of your custom DPP template')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Layout Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('Layout Mode')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['single-column', 'Single Column', 'Sections stacked in a single column', <AlignLeft key="sc" className="h-5 w-5" />],
                  ['two-column', 'Two Columns', 'Sections in a two-column grid', <Columns2 key="tc" className="h-5 w-5" />],
                  ['sidebar', 'Sidebar', 'Product info sidebar with sections main area', <PanelLeft key="sb" className="h-5 w-5" />],
                ] as [DPPCustomLayoutMode, string, string, ReactNode][]).map(([value, label, desc, icon]) => (
                  <button
                    key={value}
                    onClick={() => updateCustomLayout('layoutMode', value)}
                    className={`p-3 rounded-lg border text-center text-sm transition-all ${
                      resolved.customLayout.layoutMode === value
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex justify-center mb-1.5 text-muted-foreground">{icon}</div>
                    <p className="font-medium">{t(label)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(desc)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Section Style */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('Section Style')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['card', 'Cards', 'Sections in styled cards with shadow and border'],
                  ['flat', 'Flat', 'Sections without cards, headings and dividers'],
                  ['accordion', 'Accordion', 'Collapsible accordion sections'],
                ] as [DPPCustomSectionStyle, string, string][]).map(([value, label, desc]) => (
                  <button
                    key={value}
                    onClick={() => updateCustomLayout('sectionStyle', value)}
                    className={`p-3 rounded-lg border text-center text-sm transition-all ${
                      resolved.customLayout.sectionStyle === value
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <p className="font-medium">{t(label)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(desc)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Header Style */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('Header Style')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  ['icon-left', 'Icon Left', <AlignLeft key="il" className="h-4 w-4" />],
                  ['simple', 'Simple', <Type key="si" className="h-4 w-4" />],
                  ['centered', 'Centered', <AlignCenter key="ce" className="h-4 w-4" />],
                  ['underlined', 'Underlined', <Minus key="ul" className="h-4 w-4" />],
                ] as [DPPCustomHeaderStyle, string, ReactNode][]).map(([value, label, icon]) => (
                  <button
                    key={value}
                    onClick={() => updateCustomLayout('headerStyle', value)}
                    className={`p-3 rounded-lg border text-center text-sm transition-all ${
                      resolved.customLayout.headerStyle === value
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex justify-center mb-1 text-muted-foreground">{icon}</div>
                    <p className="font-medium text-xs">{t(label)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('Show Section Dividers')}</Label>
                <Switch
                  checked={resolved.customLayout.showSectionDividers}
                  onCheckedChange={(v) => updateCustomLayout('showSectionDividers', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t('Compact Mode')}</Label>
                <Switch
                  checked={resolved.customLayout.compactMode}
                  onCheckedChange={(v) => updateCustomLayout('compactMode', v)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. Theme Presets */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Theme Presets')}</CardTitle>
          <CardDescription>{t('Quick start with a predefined color scheme')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(DPP_THEME_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                  designForm.preset === key ? 'border-primary ring-2 ring-primary/20' : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                {designForm.preset === key && (
                  <span className="absolute top-2 right-2 text-xs font-medium text-primary">{t('Active')}</span>
                )}
                <div className="flex gap-1.5 mb-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.preview.primary }} />
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.preview.secondary }} />
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: preset.preview.accent }} />
                </div>
                <p className="font-medium text-sm">{t(preset.name)}</p>
                <p className="text-xs text-muted-foreground">{t(preset.description)}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Color Palette')}</CardTitle>
          <CardDescription>{t('Fine-tune the colors used on your DPP pages')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {([
              ['secondaryColor', 'Secondary Color'],
              ['accentColor', 'Accent Color'],
              ['pageBackground', 'Page Background'],
              ['cardBackground', 'Card Background'],
              ['textColor', 'Text Color'],
              ['headingColor', 'Heading Color'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label className="text-sm">{t(label)}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={resolved.colors[key]}
                    onChange={(e) => updateColors(key, e.target.value)}
                    className="w-10 h-10 rounded-md border cursor-pointer"
                  />
                  <Input
                    value={resolved.colors[key]}
                    onChange={(e) => updateColors(key, e.target.value)}
                    className="font-mono text-sm flex-1"
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setDesignForm(prev => ({ ...prev, colors: undefined, preset: 'custom' }))}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            {t('Reset Colors')}
          </Button>
        </CardContent>
      </Card>

      {/* 3. Typography */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Typography')}</CardTitle>
          <CardDescription>{t('Configure fonts and text sizes')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Font Family')}</Label>
            <Select
              value={resolved.typography.fontFamily}
              onValueChange={(v) => updateTypography('fontFamily', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">{t('System Default')}</SelectItem>
                {(['Inter', 'Roboto', 'Poppins', 'Merriweather', 'Playfair Display'] as DPPFontFamily[]).map(f => (
                  <SelectItem key={f} value={f} style={{ fontFamily: FONT_FAMILY_MAP[f] }}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Heading Font Size')}</Label>
              <div className="flex gap-1">
                {(['small', 'medium', 'large'] as DPPFontSize[]).map(s => (
                  <button
                    key={s}
                    onClick={() => updateTypography('headingFontSize', s)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      resolved.typography.headingFontSize === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span style={{ fontSize: HEADING_FONT_SIZE_MAP[s] }}>{t(s.charAt(0).toUpperCase() + s.slice(1) as 'Small' | 'Medium' | 'Large')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Body Font Size')}</Label>
              <div className="flex gap-1">
                {(['small', 'medium', 'large'] as DPPFontSize[]).map(s => (
                  <button
                    key={s}
                    onClick={() => updateTypography('bodyFontSize', s)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      resolved.typography.bodyFontSize === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span style={{ fontSize: BODY_FONT_SIZE_MAP[s] }}>{t(s.charAt(0).toUpperCase() + s.slice(1) as 'Small' | 'Medium' | 'Large')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Heading Font Weight')}</Label>
            <Select
              value={resolved.typography.headingFontWeight}
              onValueChange={(v) => updateTypography('headingFontWeight', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['normal', 'semibold', 'bold', 'extrabold'] as DPPFontWeight[]).map(w => (
                  <SelectItem key={w} value={w} style={{ fontWeight: FONT_WEIGHT_MAP[w] }}>
                    {t({ normal: 'Normal', semibold: 'Semibold', bold: 'Bold', extrabold: 'Extra Bold' }[w])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 4. Hero / Header */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Hero / Header')}</CardTitle>
          <CardDescription>{t('Configure the hero section at the top of your DPP pages')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t('Show Hero Section')}</Label>
            <Switch
              checked={resolved.hero.visible}
              onCheckedChange={(v) => updateHero('visible', v)}
            />
          </div>

          {resolved.hero.visible && (
            <>
              <div className="space-y-2">
                <Label>{t('Hero Style')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    ['gradient', 'Gradient'],
                    ['solid', 'Solid Color'],
                    ['image', 'Background Image'],
                    ['minimal', 'Minimal'],
                  ] as [DPPHeroStyle, string][]).map(([style, label]) => (
                    <button
                      key={style}
                      onClick={() => updateHero('style', style)}
                      className={`p-3 rounded-lg border text-center text-sm transition-all ${
                        resolved.hero.style === style
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('Hero Height')}</Label>
                <div className="flex gap-1">
                  {(['compact', 'normal', 'tall'] as DPPHeroHeight[]).map(h => (
                    <button
                      key={h}
                      onClick={() => updateHero('height', h)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                        resolved.hero.height === h
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {t({ compact: 'Compact', normal: 'Medium', tall: 'Tall' }[h])}
                    </button>
                  ))}
                </div>
              </div>

              {resolved.hero.style === 'image' && (
                <>
                  <div className="space-y-2">
                    <Label>{t('Upload Hero Image')}</Label>
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => heroInputRef.current?.click()}
                    >
                      {isUploadingHero ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                      ) : resolved.hero.backgroundImage ? (
                        <img
                          src={resolved.hero.backgroundImage}
                          alt="Hero"
                          className="h-24 mx-auto rounded object-cover"
                        />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">{t('PNG, JPG, WebP up to 2MB')}</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={heroInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleHeroUpload(file);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Overlay Opacity')}: {resolved.hero.overlayOpacity}%</Label>
                    <Slider
                      value={[resolved.hero.overlayOpacity]}
                      onValueChange={([v]) => updateHero('overlayOpacity', v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 5. Card Styling */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Card Styling')}</CardTitle>
          <CardDescription>{t('Customize the appearance of content cards')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Border Radius')}</Label>
            <div className="flex gap-2">
              {(['none', 'small', 'medium', 'large', 'full'] as DPPBorderRadius[]).map(r => (
                <button
                  key={r}
                  onClick={() => updateCards('borderRadius', r)}
                  className={`flex-1 p-2 flex flex-col items-center gap-1.5 rounded-lg border transition-all ${
                    resolved.cards.borderRadius === r
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <div
                    className="w-8 h-8 bg-muted border"
                    style={{ borderRadius: BORDER_RADIUS_MAP[r] }}
                  />
                  <span className="text-xs">{t({ none: 'None', small: 'Small', medium: 'Medium', large: 'Large', full: 'Full' }[r])}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Shadow Depth')}</Label>
            <div className="flex gap-2">
              {(['none', 'subtle', 'medium', 'strong'] as DPPShadowDepth[]).map(s => (
                <button
                  key={s}
                  onClick={() => updateCards('shadowDepth', s)}
                  className={`flex-1 p-2 flex flex-col items-center gap-1.5 rounded-lg border transition-all ${
                    resolved.cards.shadowDepth === s
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <div
                    className="w-8 h-8 bg-white rounded-md"
                    style={{ boxShadow: SHADOW_MAP[s] }}
                  />
                  <span className="text-xs">{t({ none: 'None', subtle: 'Subtle', medium: 'Medium', strong: 'Strong' }[s])}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Border Style')}</Label>
            <div className="flex gap-2">
              {(['none', 'thin', 'thick'] as DPPBorderStyle[]).map(b => (
                <button
                  key={b}
                  onClick={() => updateCards('borderStyle', b)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                    resolved.cards.borderStyle === b
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t({ none: 'None', thin: 'Thin', thick: 'Thick' }[b])}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('Background Opacity')}: {resolved.cards.backgroundOpacity}%</Label>
            <Slider
              value={[resolved.cards.backgroundOpacity]}
              onValueChange={([v]) => updateCards('backgroundOpacity', v)}
              min={0}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* 6. Section Layout */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Section Layout')}</CardTitle>
          <CardDescription>{t('Configure the order and visibility of sections')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {resolved.sections.order.map((sectionId, index) => {
              const section = SECTION_LABELS[sectionId];
              const config = resolved.sections.configs[sectionId] ?? { visible: true, defaultCollapsed: false };
              return (
                <div
                  key={sectionId}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      title={t('Move Up')}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === resolved.sections.order.length - 1}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      title={t('Move Down')}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    {section.icon}
                    <span className="font-medium text-sm">{t(section.labelKey)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">{t('Visible')}</Label>
                      <Switch
                        checked={config.visible}
                        onCheckedChange={(v) => updateSectionConfig(sectionId, 'visible', v)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">{t('Start Collapsed')}</Label>
                      <Switch
                        checked={config.defaultCollapsed}
                        onCheckedChange={(v) => updateSectionConfig(sectionId, 'defaultCollapsed', v)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 7. Footer */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Footer Configuration')}</CardTitle>
          <CardDescription>{t('Configure footer links and social media')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Legal Notice URL')}</Label>
              <Input
                value={resolved.footer.legalNoticeUrl}
                onChange={(e) => updateFooter('legalNoticeUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Privacy Policy URL')}</Label>
              <Input
                value={resolved.footer.privacyPolicyUrl}
                onChange={(e) => updateFooter('privacyPolicyUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>{t('Show Powered By Text')}</Label>
            <Switch
              checked={resolved.footer.showPoweredBy}
              onCheckedChange={(v) => updateFooter('showPoweredBy', v)}
            />
          </div>

          <div className="space-y-3">
            <Label>{t('Social Media Links')}</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('Website')}</Label>
                <Input
                  value={resolved.footer.socialLinks.website}
                  onChange={(e) => updateSocialLink('website', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('Instagram')}</Label>
                <Input
                  value={resolved.footer.socialLinks.instagram}
                  onChange={(e) => updateSocialLink('instagram', e.target.value)}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('LinkedIn')}</Label>
                <Input
                  value={resolved.footer.socialLinks.linkedin}
                  onChange={(e) => updateSocialLink('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('Twitter / X')}</Label>
                <Input
                  value={resolved.footer.socialLinks.twitter}
                  onChange={(e) => updateSocialLink('twitter', e.target.value)}
                  placeholder="https://x.com/..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8. Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Live Preview')}</CardTitle>
          <CardDescription>{t('This is how your branding appears across the app')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg overflow-hidden border"
            style={{
              backgroundColor: resolved.colors.pageBackground,
              fontFamily: FONT_FAMILY_MAP[resolved.typography.fontFamily],
            }}
          >
            {/* Preview Hero */}
            {resolved.hero.visible && (
              <div
                className="p-6"
                style={getHeroStyle(resolved.hero, primaryColor, resolved.colors.secondaryColor).style}
              >
                <h3
                  className="text-lg mb-1"
                  style={{
                    ...getHeadingStyle(resolved.typography, resolved.colors),
                    color: resolved.hero.style !== 'minimal' ? '#FFFFFF' : resolved.colors.headingColor,
                  }}
                >
                  Product Name
                </h3>
                <p
                  className="text-sm"
                  style={{
                    color: resolved.hero.style !== 'minimal' ? 'rgba(255,255,255,0.8)' : resolved.colors.textColor,
                  }}
                >
                  Manufacturer Inc.
                </p>
              </div>
            )}

            {/* Preview Cards */}
            <div className="p-4 space-y-3">
              {resolved.sections.order.slice(0, 3).map(sectionId => {
                const section = SECTION_LABELS[sectionId];
                const config = resolved.sections.configs[sectionId] ?? { visible: true, defaultCollapsed: false };
                if (!config.visible) return null;
                return (
                  <div key={sectionId} className="p-3" style={getCardStyle(resolved.cards)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: primaryColor }}>{section.icon}</span>
                      <span
                        className="text-sm"
                        style={{
                          fontWeight: FONT_WEIGHT_MAP[resolved.typography.headingFontWeight],
                          color: resolved.colors.headingColor,
                        }}
                      >
                        {t(section.labelKey)}
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full w-3/4"
                      style={{ backgroundColor: `${primaryColor}33` }}
                    />
                    <div
                      className="h-2 rounded-full w-1/2 mt-1.5"
                      style={{ backgroundColor: `${primaryColor}1a` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Preview Footer */}
            <div
              className="p-3 border-t text-center"
              style={{ color: resolved.colors.textColor }}
            >
              <p className="text-xs opacity-60">
                {resolved.footer.showPoweredBy ? branding.poweredByText : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saved ? t('DPP Design saved!') : saveError ? t('Failed to save DPP Design') : t('Save DPP Design')}
        </Button>
      </div>
    </div>
  );
}
