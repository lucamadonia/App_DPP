/**
 * DPP Design Settings Tab
 *
 * Split-pane editor with real-time live preview.
 * State management hub — delegates rendering to DPPDesignEditorLayout.
 */

import { useState, useEffect, useRef } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { uploadHeroImage } from '@/services/supabase';
import type { DPPDesignSettings, DPPSectionId, DPPTemplateName } from '@/types/database';
import { resolveDesign } from '@/lib/dpp-design-utils';
import { DPP_THEME_PRESETS } from '@/lib/dpp-design-defaults';
import { DPPDesignEditorLayout } from './dpp-designer/DPPDesignEditorLayout';
import { usePreviewProduct } from './dpp-designer/usePreviewProduct';
import type { ViewMode, Viewport } from './dpp-designer/DPPDesignToolbar';

export function DPPDesignTab() {
  const { rawDPPDesign, updateDPPDesign, branding, qrCodeSettings, updateQRCodeSettings } = useBranding();
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Template selection
  const [templateCustomer, setTemplateCustomer] = useState<DPPTemplateName>(qrCodeSettings.dppTemplateCustomer);
  const [templateCustoms, setTemplateCustoms] = useState<DPPTemplateName>(qrCodeSettings.dppTemplateCustoms);

  // Editor state
  const [viewMode, setViewMode] = useState<ViewMode>('consumer');
  const [viewport, setViewport] = useState<Viewport>('desktop');

  // Design form
  const [designForm, setDesignForm] = useState<DPPDesignSettings>(() => rawDPPDesign || {});
  useEffect(() => {
    if (rawDPPDesign) setDesignForm(rawDPPDesign);
  }, [rawDPPDesign]);

  // Preview product
  const { product, loading: productLoading } = usePreviewProduct();

  const resolved = resolveDesign(designForm);
  const primaryColor = branding.primaryColor;

  // --- Update functions ---

  const updateColors = (key: string, value: string) => {
    setDesignForm(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const updateTypography = (key: string, value: string) => {
    setDesignForm(prev => ({ ...prev, typography: { ...prev.typography, [key]: value } }));
  };

  const updateHero = (key: string, value: unknown) => {
    setDesignForm(prev => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  };

  const updateCards = (key: string, value: unknown) => {
    setDesignForm(prev => ({ ...prev, cards: { ...prev.cards, [key]: value } }));
  };

  const updateFooter = (key: string, value: unknown) => {
    setDesignForm(prev => ({ ...prev, footer: { ...prev.footer, [key]: value } }));
  };

  const updateCustomLayout = (key: string, value: unknown) => {
    setDesignForm(prev => ({ ...prev, customLayout: { ...prev.customLayout, [key]: value } }));
  };

  const updateSocialLink = (key: string, value: string) => {
    setDesignForm(prev => ({
      ...prev,
      footer: { ...prev.footer, socialLinks: { ...prev.footer?.socialLinks, [key]: value } },
    }));
  };

  const updateSectionOrder = (order: DPPSectionId[]) => {
    setDesignForm(prev => ({ ...prev, sections: { ...prev.sections, order } }));
  };

  const updateSectionConfig = (id: DPPSectionId, key: string, value: boolean) => {
    setDesignForm(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        configs: { ...prev.sections?.configs, [id]: { ...prev.sections?.configs?.[id], [key]: value } },
      },
    }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = DPP_THEME_PRESETS[presetKey];
    if (!preset) return;
    setDesignForm(prev => ({ ...prev, ...preset.settings, preset: presetKey }));
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

    // Save both design settings and template selection in parallel
    const [designSuccess] = await Promise.all([
      updateDPPDesign(designForm),
      updateQRCodeSettings({
        dppTemplateCustomer: templateCustomer,
        dppTemplateCustoms: templateCustoms,
      }),
    ]);

    setIsSaving(false);
    if (designSuccess) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <DPPDesignEditorLayout
      designForm={designForm}
      viewMode={viewMode}
      viewport={viewport}
      templateCustomer={templateCustomer}
      templateCustoms={templateCustoms}
      product={product}
      productLoading={productLoading}
      primaryColor={primaryColor}
      isSaving={isSaving}
      saved={saved}
      isUploadingHero={isUploadingHero}
      heroInputRef={heroInputRef}
      setDesignForm={setDesignForm}
      setViewMode={setViewMode}
      setViewport={setViewport}
      setTemplateCustomer={setTemplateCustomer}
      setTemplateCustoms={setTemplateCustoms}
      updateColors={updateColors}
      updateTypography={updateTypography}
      updateHero={updateHero}
      updateCards={updateCards}
      updateFooter={updateFooter}
      updateCustomLayout={updateCustomLayout}
      updateSocialLink={updateSocialLink}
      updateSectionOrder={updateSectionOrder}
      updateSectionConfig={updateSectionConfig}
      applyPreset={applyPreset}
      moveSection={moveSection}
      handleHeroUpload={handleHeroUpload}
      handleSave={handleSave}
    />
  );
}
