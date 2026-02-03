import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { LabelElement, LabelFieldKey } from '@/types/master-label-editor';
import { LABEL_FIELD_METADATA } from '@/types/master-label-editor';

interface LabelElementSettingsPanelProps {
  element: LabelElement | null;
  onChange: (updated: LabelElement) => void;
}

function AlignmentPicker({ value, onChange }: { value: string; onChange: (v: 'left' | 'center' | 'right') => void }) {
  return (
    <div className="flex gap-1">
      {(['left', 'center', 'right'] as const).map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`px-2 py-1 text-xs rounded ${value === a ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        >
          {a === 'left' ? 'L' : a === 'center' ? 'C' : 'R'}
        </button>
      ))}
    </div>
  );
}

export function LabelElementSettingsPanel({ element, onChange }: LabelElementSettingsPanelProps) {
  const { t } = useTranslation('products');

  if (!element) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t('ml.editor.selectElement')}
      </div>
    );
  }

  const update = <T extends LabelElement>(partial: Partial<T>) => {
    onChange({ ...element, ...partial } as LabelElement);
  };

  return (
    <div className="p-4 space-y-4 animate-panel-slide-in">
      <h3 className="text-sm font-medium">{t(`ml.element.${element.type.replace('-', '')}`)}</h3>

      {/* Text element */}
      {element.type === 'text' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.content')}</Label>
            <Textarea
              value={element.content}
              onChange={(e) => update({ content: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.fontSize')}</Label>
              <Input
                type="number"
                min={3.4}
                max={20}
                step={0.5}
                value={element.fontSize}
                onChange={(e) => update({ fontSize: parseFloat(e.target.value) || 7 })}
                className="text-sm h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.color')}</Label>
              <div className="flex gap-1.5">
                <input
                  type="color"
                  value={element.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="h-8 w-8 rounded border cursor-pointer"
                />
                <Input value={element.color} onChange={(e) => update({ color: e.target.value })} className="text-xs h-8 flex-1" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={element.fontWeight === 'bold'} onCheckedChange={(v) => update({ fontWeight: v ? 'bold' : 'normal' })} />
              <Label className="text-xs">{t('ml.editor.bold')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={element.italic} onCheckedChange={(v) => update({ italic: v })} />
              <Label className="text-xs">{t('ml.editor.italic')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={element.uppercase} onCheckedChange={(v) => update({ uppercase: v })} />
              <Label className="text-xs">{t('ml.editor.uppercase')}</Label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* Field-Value element */}
      {element.type === 'field-value' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.field')}</Label>
            <Select value={element.fieldKey} onValueChange={(v) => update({ fieldKey: v as LabelFieldKey })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_FIELD_METADATA.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {t(f.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={element.showLabel} onCheckedChange={(v) => update({ showLabel: v })} />
            <Label className="text-xs">{t('ml.editor.showLabel')}</Label>
          </div>
          {element.showLabel && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.customLabel')}</Label>
              <Input
                value={element.labelText || ''}
                onChange={(e) => update({ labelText: e.target.value })}
                placeholder={t(`ml.field.${element.fieldKey}`)}
                className="text-sm h-8"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.fontSize')}</Label>
              <Input type="number" min={3.4} max={20} step={0.5} value={element.fontSize} onChange={(e) => update({ fontSize: parseFloat(e.target.value) || 7 })} className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.layout')}</Label>
              <Select value={element.layout} onValueChange={(v) => update({ layout: v as 'inline' | 'stacked' })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">{t('ml.editor.layoutInline')}</SelectItem>
                  <SelectItem value="stacked">{t('ml.editor.layoutStacked')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Value Color + Label Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.valueColor')}</Label>
              <div className="flex gap-1.5">
                <input type="color" value={element.color} onChange={(e) => update({ color: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
                <Input value={element.color} onChange={(e) => update({ color: e.target.value })} className="text-xs h-8 flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.labelColor')}</Label>
              <div className="flex gap-1.5">
                <input type="color" value={element.labelColor} onChange={(e) => update({ labelColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
                <Input value={element.labelColor} onChange={(e) => update({ labelColor: e.target.value })} className="text-xs h-8 flex-1" />
              </div>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.fontFamily')}</Label>
            <Select value={element.fontFamily || '_default'} onValueChange={(v) => update({ fontFamily: v === '_default' ? undefined : v as 'Helvetica' | 'Courier' | 'Times-Roman' })}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={t('ml.editor.fontFamilyDefault')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_default">({t('ml.editor.fontFamilyDefault')})</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Courier">Courier</SelectItem>
                <SelectItem value="Times-Roman">Times Roman</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bold / Italic / Uppercase toggles */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={element.fontWeight === 'bold'} onCheckedChange={(v) => update({ fontWeight: v ? 'bold' : 'normal' })} />
              <Label className="text-xs">{t('ml.editor.bold')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={element.italic === true} onCheckedChange={(v) => update({ italic: v })} />
              <Label className="text-xs">{t('ml.editor.italic')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={element.uppercase === true} onCheckedChange={(v) => update({ uppercase: v })} />
              <Label className="text-xs">{t('ml.editor.uppercase')}</Label>
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.lineHeight')}</Label>
            <Slider value={[element.lineHeight ?? 1.2]} onValueChange={([v]) => update({ lineHeight: v })} min={0.8} max={2.5} step={0.1} />
            <span className="text-xs text-muted-foreground">{(element.lineHeight ?? 1.2).toFixed(1)}</span>
          </div>

          {/* Margin Bottom */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.marginBottom')}</Label>
            <Slider value={[element.marginBottom ?? 2]} onValueChange={([v]) => update({ marginBottom: v })} min={0} max={20} step={1} />
            <span className="text-xs text-muted-foreground">{element.marginBottom ?? 2}pt</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* QR Code element */}
      {element.type === 'qr-code' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.qrSize')}</Label>
            <Slider value={[element.size]} onValueChange={([v]) => update({ size: v })} min={24} max={100} step={4} />
            <span className="text-xs text-muted-foreground">{element.size}pt</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={element.showLabel} onCheckedChange={(v) => update({ showLabel: v })} />
            <Label className="text-xs">{t('ml.editor.showLabel')}</Label>
          </div>
          {element.showLabel && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.labelText')}</Label>
              <Input value={element.labelText} onChange={(e) => update({ labelText: e.target.value })} className="text-sm h-8" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={element.showUrl} onCheckedChange={(v) => update({ showUrl: v })} />
            <Label className="text-xs">{t('ml.editor.showUrl')}</Label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* Compliance Badge element */}
      {element.type === 'compliance-badge' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.badgeId')}</Label>
              <Input value={element.badgeId} onChange={(e) => update({ badgeId: e.target.value })} className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.symbol')}</Label>
              <Input value={element.symbol} onChange={(e) => update({ symbol: e.target.value })} className="text-sm h-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.style')}</Label>
            <Select value={element.style} onValueChange={(v) => update({ style: v as 'outlined' | 'filled' | 'minimal' })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="outlined">{t('ml.editor.styleOutlined')}</SelectItem>
                <SelectItem value="filled">{t('ml.editor.styleFilled')}</SelectItem>
                <SelectItem value="minimal">{t('ml.editor.styleMinimal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.fontSize')}</Label>
            <Input type="number" min={3.4} max={14} step={0.5} value={element.size} onChange={(e) => update({ size: parseFloat(e.target.value) || 7 })} className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.color')}</Label>
            <div className="flex gap-1.5">
              <input type="color" value={element.color} onChange={(e) => update({ color: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={element.color} onChange={(e) => update({ color: e.target.value })} className="text-xs h-8 flex-1" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* Pictogram element */}
      {element.type === 'pictogram' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.pictogramId')}</Label>
            <Input value={element.pictogramId} onChange={(e) => update({ pictogramId: e.target.value })} className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.size')}</Label>
            <Slider value={[element.size]} onValueChange={([v]) => update({ size: v })} min={12} max={60} step={2} />
            <span className="text-xs text-muted-foreground">{element.size}pt</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.color')}</Label>
            <div className="flex gap-1.5">
              <input type="color" value={element.color} onChange={(e) => update({ color: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={element.color} onChange={(e) => update({ color: e.target.value })} className="text-xs h-8 flex-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={element.showLabel} onCheckedChange={(v) => update({ showLabel: v })} />
            <Label className="text-xs">{t('ml.editor.showLabel')}</Label>
          </div>
          {element.showLabel && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.labelText')}</Label>
              <Input value={element.labelText || ''} onChange={(e) => update({ labelText: e.target.value })} className="text-sm h-8" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* Divider element */}
      {element.type === 'divider' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.thickness')}</Label>
            <Input type="number" min={0.25} max={4} step={0.25} value={element.thickness} onChange={(e) => update({ thickness: parseFloat(e.target.value) || 0.5 })} className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.style')}</Label>
            <Select value={element.style} onValueChange={(v) => update({ style: v as 'solid' | 'dashed' | 'dotted' })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.color')}</Label>
            <div className="flex gap-1.5">
              <input type="color" value={element.color} onChange={(e) => update({ color: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={element.color} onChange={(e) => update({ color: e.target.value })} className="text-xs h-8 flex-1" />
            </div>
          </div>
        </>
      )}

      {/* Spacer element */}
      {element.type === 'spacer' && (
        <div className="space-y-1.5">
          <Label className="text-xs">{t('ml.editor.height')}</Label>
          <Slider value={[element.height]} onValueChange={([v]) => update({ height: v })} min={2} max={40} step={2} />
          <span className="text-xs text-muted-foreground">{element.height}pt</span>
        </div>
      )}

      {/* Material Code element */}
      {element.type === 'material-code' && (
        <>
          <div className="flex items-center gap-2">
            <Switch checked={element.autoPopulate} onCheckedChange={(v) => update({ autoPopulate: v })} />
            <Label className="text-xs">{t('ml.editor.autoPopulate')}</Label>
          </div>
          {!element.autoPopulate && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.codes')}</Label>
              <Input
                value={element.codes.join(', ')}
                onChange={(e) => update({ codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="PAP 20, LDPE 4"
                className="text-sm h-8"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* Barcode element */}
      {element.type === 'barcode' && (
        <>
          <div className="flex items-center gap-2">
            <Switch checked={element.autoPopulate} onCheckedChange={(v) => update({ autoPopulate: v })} />
            <Label className="text-xs">{t('ml.editor.autoPopulate')}</Label>
          </div>
          {!element.autoPopulate && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.value')}</Label>
              <Input value={element.value} onChange={(e) => update({ value: e.target.value })} className="text-sm h-8" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.format')}</Label>
            <Select value={element.format} onValueChange={(v) => update({ format: v as 'ean13' | 'code128' | 'code39' })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ean13">EAN-13</SelectItem>
                <SelectItem value="code128">Code 128</SelectItem>
                <SelectItem value="code39">Code 39</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.height')}</Label>
            <Slider value={[element.height]} onValueChange={([v]) => update({ height: v })} min={15} max={60} step={5} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={element.showText} onCheckedChange={(v) => update({ showText: v })} />
            <Label className="text-xs">{t('ml.editor.showText')}</Label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* Image element */}
      {element.type === 'image' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.imageUrl')}</Label>
            <Input value={element.src} onChange={(e) => update({ src: e.target.value })} placeholder="https://..." className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.altText')}</Label>
            <Input value={element.alt} onChange={(e) => update({ alt: e.target.value })} className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.width')}</Label>
            <Slider value={[element.width]} onValueChange={([v]) => update({ width: v })} min={10} max={100} step={5} />
            <span className="text-xs text-muted-foreground">{element.width}%</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}

      {/* Icon-Text element */}
      {element.type === 'icon-text' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.text')}</Label>
            <Input value={element.text} onChange={(e) => update({ text: e.target.value })} className="text-sm h-8" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.fontSize')}</Label>
              <Input type="number" min={3.4} max={14} step={0.5} value={element.fontSize} onChange={(e) => update({ fontSize: parseFloat(e.target.value) || 6 })} className="text-sm h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('ml.editor.iconSize')}</Label>
              <Input type="number" min={6} max={20} step={1} value={element.iconSize} onChange={(e) => update({ iconSize: parseInt(e.target.value) || 8 })} className="text-sm h-8" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.color')}</Label>
            <div className="flex gap-1.5">
              <input type="color" value={element.color} onChange={(e) => update({ color: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={element.color} onChange={(e) => update({ color: e.target.value })} className="text-xs h-8 flex-1" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('ml.editor.alignment')}</Label>
            <AlignmentPicker value={element.alignment} onChange={(v) => update({ alignment: v })} />
          </div>
        </>
      )}
    </div>
  );
}
