import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { EmailDesignConfig } from './emailEditorTypes';

interface DesignSettingsPanelProps {
  designConfig: EmailDesignConfig;
  onChange: (config: EmailDesignConfig) => void;
}

export function DesignSettingsPanel({ designConfig, onChange }: DesignSettingsPanelProps) {
  const { t } = useTranslation('returns');
  const { layout, header, footer } = designConfig;

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
    <Accordion type="multiple" defaultValue={['layout', 'header', 'footer', 'typography']} className="space-y-2">
      {/* Layout */}
      <AccordionItem value="layout" className="border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-medium py-3">{t('Layout')}</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="space-y-1">
            <Label>{t('Max Width')} (px)</Label>
            <Input
              type="number"
              min={400}
              max={800}
              value={layout.maxWidth}
              onChange={(e) => updateLayout({ maxWidth: parseInt(e.target.value) || 600 })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('Background')}</Label>
              <div className="flex gap-1">
                <input type="color" value={layout.backgroundColor} onChange={(e) => updateLayout({ backgroundColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                <Input value={layout.backgroundColor} onChange={(e) => updateLayout({ backgroundColor: e.target.value })} className="text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('Content Background')}</Label>
              <div className="flex gap-1">
                <input type="color" value={layout.contentBackgroundColor} onChange={(e) => updateLayout({ contentBackgroundColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                <Input value={layout.contentBackgroundColor} onChange={(e) => updateLayout({ contentBackgroundColor: e.target.value })} className="text-xs" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('Border Radius')} (px)</Label>
            <Input
              type="number"
              min={0}
              max={24}
              value={layout.borderRadius}
              onChange={(e) => updateLayout({ borderRadius: parseInt(e.target.value) || 0 })}
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Header */}
      <AccordionItem value="header" className="border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-medium py-3">{t('Header')}</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <Label>{t('Show Header')}</Label>
            <Switch checked={header.enabled} onCheckedChange={(v) => updateHeader({ enabled: v })} />
          </div>
          {header.enabled && (
            <>
              <div className="flex items-center justify-between">
                <Label>{t('Show Logo')}</Label>
                <Switch checked={header.showLogo} onCheckedChange={(v) => updateHeader({ showLogo: v })} />
              </div>
              {header.showLogo && (
                <>
                  <div className="space-y-1">
                    <Label>{t('Logo URL')}</Label>
                    <Input value={header.logoUrl} onChange={(e) => updateHeader({ logoUrl: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('Logo Height')} (px)</Label>
                    <Input type="number" min={20} max={80} value={header.logoHeight} onChange={(e) => updateHeader({ logoHeight: parseInt(e.target.value) || 40 })} />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t('Background')}</Label>
                  <div className="flex gap-1">
                    <input type="color" value={header.backgroundColor} onChange={(e) => updateHeader({ backgroundColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                    <Input value={header.backgroundColor} onChange={(e) => updateHeader({ backgroundColor: e.target.value })} className="text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('Text Color')}</Label>
                  <div className="flex gap-1">
                    <input type="color" value={header.textColor} onChange={(e) => updateHeader({ textColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                    <Input value={header.textColor} onChange={(e) => updateHeader({ textColor: e.target.value })} className="text-xs" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t('Alignment')}</Label>
                <Select value={header.alignment} onValueChange={(v) => updateHeader({ alignment: v as 'left' | 'center' | 'right' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
      <AccordionItem value="footer" className="border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-medium py-3">{t('Footer')}</AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <Label>{t('Show Footer')}</Label>
            <Switch checked={footer.enabled} onCheckedChange={(v) => updateFooter({ enabled: v })} />
          </div>
          {footer.enabled && (
            <>
              <div className="space-y-1">
                <Label>{t('Footer Text')}</Label>
                <Input value={footer.text} onChange={(e) => updateFooter({ text: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t('Background')}</Label>
                  <div className="flex gap-1">
                    <input type="color" value={footer.backgroundColor} onChange={(e) => updateFooter({ backgroundColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                    <Input value={footer.backgroundColor} onChange={(e) => updateFooter({ backgroundColor: e.target.value })} className="text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t('Text Color')}</Label>
                  <div className="flex gap-1">
                    <input type="color" value={footer.textColor} onChange={(e) => updateFooter({ textColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                    <Input value={footer.textColor} onChange={(e) => updateFooter({ textColor: e.target.value })} className="text-xs" />
                  </div>
                </div>
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
            <Label>{t('Font Family')}</Label>
            <Select value={layout.fontFamily} onValueChange={(v) => updateLayout({ fontFamily: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Label>{t('Base Font Size')} (px)</Label>
            <Input
              type="number"
              min={12}
              max={20}
              value={layout.baseFontSize}
              onChange={(e) => updateLayout({ baseFontSize: parseInt(e.target.value) || 14 })}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
