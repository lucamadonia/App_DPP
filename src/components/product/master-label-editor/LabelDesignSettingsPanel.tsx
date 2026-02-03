import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LabelDesign, LabelSection } from '@/types/master-label-editor';

interface LabelDesignSettingsPanelProps {
  design: LabelDesign;
  onDesignChange: (design: LabelDesign) => void;
}

export function LabelDesignSettingsPanel({ design, onDesignChange }: LabelDesignSettingsPanelProps) {
  const { t } = useTranslation('products');

  const update = (partial: Partial<LabelDesign>) => {
    onDesignChange({ ...design, ...partial });
  };

  const updateSection = (sectionId: string, partial: Partial<LabelSection>) => {
    const sections = design.sections.map(s =>
      s.id === sectionId ? { ...s, ...partial } : s
    );
    onDesignChange({ ...design, sections });
  };

  return (
    <div className="p-4 space-y-6 animate-panel-slide-in">
      {/* Page Settings */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('ml.editor.pageSettings')}</h3>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('ml.editor.backgroundColor')}</Label>
          <div className="flex gap-1.5">
            <input
              type="color"
              value={design.backgroundColor}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              className="h-8 w-8 rounded border cursor-pointer"
            />
            <Input value={design.backgroundColor} onChange={(e) => update({ backgroundColor: e.target.value })} className="text-xs h-8 flex-1" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('ml.editor.padding')}</Label>
          <Slider value={[design.padding]} onValueChange={([v]) => update({ padding: v })} min={4} max={24} step={2} />
          <span className="text-xs text-muted-foreground">{design.padding}pt</span>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('ml.editor.typography')}</h3>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('ml.editor.fontFamily')}</Label>
          <Select value={design.fontFamily} onValueChange={(v) => update({ fontFamily: v as LabelDesign['fontFamily'] })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Helvetica">Helvetica</SelectItem>
              <SelectItem value="Courier">Courier</SelectItem>
              <SelectItem value="Times-Roman">Times Roman</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('ml.editor.baseFontSize')}</Label>
          <Input
            type="number"
            min={3.4}
            max={12}
            step={0.5}
            value={design.baseFontSize}
            onChange={(e) => update({ baseFontSize: parseFloat(e.target.value) || 6.5 })}
            className="text-sm h-8"
          />
          {design.baseFontSize < 3.4 && (
            <p className="text-xs text-destructive">{t('ml.validation.fontSizeTooSmall')}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('ml.editor.textColor')}</Label>
          <div className="flex gap-1.5">
            <input
              type="color"
              value={design.baseTextColor}
              onChange={(e) => update({ baseTextColor: e.target.value })}
              className="h-8 w-8 rounded border cursor-pointer"
            />
            <Input value={design.baseTextColor} onChange={(e) => update({ baseTextColor: e.target.value })} className="text-xs h-8 flex-1" />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('ml.editor.sections')}</h3>

        {[...design.sections].sort((a, b) => a.sortOrder - b.sortOrder).map((section) => (
          <div key={section.id} className="border rounded-md p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t(section.label)}</span>
              <Switch
                checked={section.visible}
                onCheckedChange={(v) => updateSection(section.id, { visible: v })}
              />
            </div>

            {section.visible && (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={section.showBorder}
                    onCheckedChange={(v) => updateSection(section.id, { showBorder: v })}
                  />
                  <Label className="text-xs">{t('ml.editor.showBorder')}</Label>
                </div>

                {section.showBorder && (
                  <div className="space-y-1">
                    <Label className="text-xs">{t('ml.editor.borderColor')}</Label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        value={section.borderColor}
                        onChange={(e) => updateSection(section.id, { borderColor: e.target.value })}
                        className="h-6 w-6 rounded border cursor-pointer"
                      />
                      <Input value={section.borderColor} onChange={(e) => updateSection(section.id, { borderColor: e.target.value })} className="text-xs h-6 flex-1" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('ml.editor.paddingTop')}</Label>
                    <Input type="number" min={0} max={20} step={1} value={section.paddingTop} onChange={(e) => updateSection(section.id, { paddingTop: parseInt(e.target.value) || 0 })} className="text-xs h-6" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('ml.editor.paddingBottom')}</Label>
                    <Input type="number" min={0} max={20} step={1} value={section.paddingBottom} onChange={(e) => updateSection(section.id, { paddingBottom: parseInt(e.target.value) || 0 })} className="text-xs h-6" />
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
