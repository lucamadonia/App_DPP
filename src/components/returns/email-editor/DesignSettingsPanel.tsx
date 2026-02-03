import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Paintbrush } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ColorPickerField } from './ColorPickerField';
import type { EmailDesignConfig } from './emailEditorTypes';

interface DesignSettingsPanelProps {
  designConfig: EmailDesignConfig;
  onChange: (config: EmailDesignConfig) => void;
  /** When set, the accordion scrolls to and opens this section */
  focusSection?: 'header' | 'footer' | null;
  onFocusSectionHandled?: () => void;
  /** Tenant branding for corporate design button */
  brandingLogo?: string | null;
  brandingPrimaryColor?: string;
}

export function DesignSettingsPanel({ designConfig, onChange, focusSection, onFocusSectionHandled, brandingLogo, brandingPrimaryColor }: DesignSettingsPanelProps) {
  const { t } = useTranslation('returns');
  const { layout, header, footer } = designConfig;

  const [openSections, setOpenSections] = useState<string[]>(['layout', 'header', 'footer', 'typography']);

  // When focusSection changes, open that section
  useEffect(() => {
    if (focusSection) {
      setOpenSections((prev) => prev.includes(focusSection) ? prev : [...prev, focusSection]);
      // Scroll the section into view after a tick
      setTimeout(() => {
        const el = document.getElementById(`design-section-${focusSection}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      onFocusSectionHandled?.();
    }
  }, [focusSection, onFocusSectionHandled]);

  const hasBranding = !!(brandingLogo || brandingPrimaryColor);

  const handleApplyCorporateDesign = () => {
    let updated = { ...designConfig };
    if (brandingLogo) {
      updated = {
        ...updated,
        header: {
          ...updated.header,
          enabled: true,
          showLogo: true,
          logoUrl: updated.header.logoUrl || brandingLogo,
        },
      };
    }
    if (brandingPrimaryColor) {
      // Apply primary color to header background if it's the default
      if (!updated.header.backgroundColor || updated.header.backgroundColor === '#1e293b') {
        updated = { ...updated, header: { ...updated.header, backgroundColor: brandingPrimaryColor } };
      }
      // Update all button blocks that use default blue
      const updatedBlocks = updated.blocks.map((block) => {
        if (block.type === 'button' && block.backgroundColor === '#3b82f6') {
          return { ...block, backgroundColor: brandingPrimaryColor };
        }
        if (block.type === 'hero' && block.ctaBackgroundColor === '#3b82f6') {
          return { ...block, ctaBackgroundColor: brandingPrimaryColor };
        }
        return block;
      });
      updated = { ...updated, blocks: updatedBlocks };
    }
    onChange(updated);
  };

  const updateLayout = (partial: Partial<typeof layout>) => {
    onChange({ ...designConfig, layout: { ...layout, ...partial } });
  };

  const updateHeader = (partial: Partial<typeof header>) => {
    onChange({ ...designConfig, header: { ...header, ...partial } });
  };

  const updateFooter = (partial: Partial<typeof footer>) => {
    onChange({ ...designConfig, footer: { ...footer, ...partial } });
  };

  return (
    <div className="space-y-3">
      {hasBranding && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={handleApplyCorporateDesign}
        >
          <Paintbrush className="h-3.5 w-3.5" />
          {t('Apply Corporate Design')}
        </Button>
      )}
    <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
      {/* Layout */}
      <AccordionItem value="layout" className="border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-medium py-3">{t('Layout')}</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="space-y-1">
            <Label className="text-xs">{t('Max Width')} (px)</Label>
            <input
              type="range"
              min={400}
              max={800}
              value={layout.maxWidth}
              onChange={(e) => updateLayout({ maxWidth: parseInt(e.target.value) || 600 })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{layout.maxWidth}px</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorPickerField label={t('Background')} value={layout.backgroundColor} onChange={(v) => updateLayout({ backgroundColor: v })} />
            <ColorPickerField label={t('Content Background')} value={layout.contentBackgroundColor} onChange={(v) => updateLayout({ contentBackgroundColor: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Border Radius')} (px)</Label>
            <input
              type="range"
              min={0}
              max={24}
              value={layout.borderRadius}
              onChange={(e) => updateLayout({ borderRadius: parseInt(e.target.value) || 0 })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{layout.borderRadius}px</span>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Header */}
      <AccordionItem value="header" className="border rounded-lg px-4" id="design-section-header">
        <AccordionTrigger className="text-sm font-medium py-3">{t('Header')}</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t('Show Header')}</Label>
            <Switch checked={header.enabled} onCheckedChange={(v) => updateHeader({ enabled: v })} />
          </div>
          {header.enabled && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Show Logo')}</Label>
                <Switch checked={header.showLogo} onCheckedChange={(v) => updateHeader({ showLogo: v })} />
              </div>
              {header.showLogo && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Logo URL')}</Label>
                    <Input value={header.logoUrl} onChange={(e) => updateHeader({ logoUrl: e.target.value })} placeholder="https://..." className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('Logo Height')} (px)</Label>
                    <input
                      type="range"
                      min={20}
                      max={80}
                      value={header.logoHeight}
                      onChange={(e) => updateHeader({ logoHeight: parseInt(e.target.value) || 40 })}
                      className="w-full"
                    />
                    <span className="text-xs text-muted-foreground">{header.logoHeight}px</span>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <ColorPickerField label={t('Background')} value={header.backgroundColor} onChange={(v) => updateHeader({ backgroundColor: v })} />
                <ColorPickerField label={t('Text Color')} value={header.textColor} onChange={(v) => updateHeader({ textColor: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('Alignment')}</Label>
                <Select value={header.alignment} onValueChange={(v) => updateHeader({ alignment: v as 'left' | 'center' | 'right' })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">{t('Left')}</SelectItem>
                    <SelectItem value="center">{t('Center')}</SelectItem>
                    <SelectItem value="right">{t('Right')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Footer */}
      <AccordionItem value="footer" className="border rounded-lg px-4" id="design-section-footer">
        <AccordionTrigger className="text-sm font-medium py-3">{t('Footer')}</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t('Show Footer')}</Label>
            <Switch checked={footer.enabled} onCheckedChange={(v) => updateFooter({ enabled: v })} />
          </div>
          {footer.enabled && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">{t('Footer Text')}</Label>
                <Input value={footer.text} onChange={(e) => updateFooter({ text: e.target.value })} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ColorPickerField label={t('Background')} value={footer.backgroundColor} onChange={(v) => updateFooter({ backgroundColor: v })} />
                <ColorPickerField label={t('Text Color')} value={footer.textColor} onChange={(v) => updateFooter({ textColor: v })} />
              </div>
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* Typography */}
      <AccordionItem value="typography" className="border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-medium py-3">{t('Typography')}</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="space-y-1">
            <Label className="text-xs">{t('Font Family')}</Label>
            <Select value={layout.fontFamily} onValueChange={(v) => updateLayout({ fontFamily: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                <SelectItem value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</SelectItem>
                <SelectItem value="Georgia, serif">Georgia</SelectItem>
                <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
                <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Base Font Size')} (px)</Label>
            <input
              type="range"
              min={12}
              max={20}
              value={layout.baseFontSize}
              onChange={(e) => updateLayout({ baseFontSize: parseInt(e.target.value) || 14 })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{layout.baseFontSize}px</span>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    </div>
  );
}
