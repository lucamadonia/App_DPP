import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPickerField } from './ColorPickerField';
import type { EmailBlock, SocialPlatform } from './emailEditorTypes';
import { SOCIAL_PLATFORM_LABELS } from './SocialIconSvgs';

interface BlockSettingsPanelProps {
  block: EmailBlock;
  onChange: (block: EmailBlock) => void;
}

const ALL_PLATFORMS: SocialPlatform[] = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'website', 'email'];

export function BlockSettingsPanel({ block, onChange }: BlockSettingsPanelProps) {
  const { t } = useTranslation('returns');

  switch (block.type) {
    case 'text':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Text')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Content')}</Label>
            <Textarea
              value={block.content}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              rows={5}
              className="font-mono text-sm"
            />
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Button')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Button Text')}</Label>
            <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">URL</Label>
            <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Alignment')}</Label>
            <Select value={block.alignment} onValueChange={(v) => onChange({ ...block, alignment: v as 'left' | 'center' | 'right' })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">{t('Left')}</SelectItem>
                <SelectItem value="center">{t('Center')}</SelectItem>
                <SelectItem value="right">{t('Right')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorPickerField label={t('Background')} value={block.backgroundColor} onChange={(v) => onChange({ ...block, backgroundColor: v })} />
            <ColorPickerField label={t('Text Color')} value={block.textColor} onChange={(v) => onChange({ ...block, textColor: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Border Radius')} (px)</Label>
            <Input type="number" min={0} max={50} value={block.borderRadius} onChange={(e) => onChange({ ...block, borderRadius: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      );

    case 'divider':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Divider')}</h4>
          <ColorPickerField label={t('Color')} value={block.color} onChange={(v) => onChange({ ...block, color: v })} />
          <div className="space-y-1">
            <Label className="text-xs">{t('Thickness')} (px)</Label>
            <input
              type="range"
              min={1}
              max={5}
              value={block.thickness}
              onChange={(e) => onChange({ ...block, thickness: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{block.thickness}px</span>
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Spacer')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Height')} (px)</Label>
            <input
              type="range"
              min={4}
              max={80}
              value={block.height}
              onChange={(e) => onChange({ ...block, height: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{block.height}px</span>
          </div>
        </div>
      );

    case 'info-box':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Info Box')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Label')}</Label>
            <Input value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Value')}</Label>
            <Input value={block.value} onChange={(e) => onChange({ ...block, value: e.target.value })} className="font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorPickerField label={t('Background')} value={block.backgroundColor} onChange={(v) => onChange({ ...block, backgroundColor: v })} />
            <ColorPickerField label={t('Border')} value={block.borderColor} onChange={(v) => onChange({ ...block, borderColor: v })} />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Image')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Image URL')}</Label>
            <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Alt Text')}</Label>
            <Input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Width')} (px)</Label>
            <input
              type="range"
              min={50}
              max={600}
              value={block.width}
              onChange={(e) => onChange({ ...block, width: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{block.width}px</span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Link URL')}</Label>
            <Input value={block.linkUrl} onChange={(e) => onChange({ ...block, linkUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Alignment')}</Label>
            <Select value={block.alignment} onValueChange={(v) => onChange({ ...block, alignment: v as 'left' | 'center' | 'right' })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">{t('Left')}</SelectItem>
                <SelectItem value="center">{t('Center')}</SelectItem>
                <SelectItem value="right">{t('Right')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Border Radius')} (px)</Label>
            <Input type="number" min={0} max={50} value={block.borderRadius} onChange={(e) => onChange({ ...block, borderRadius: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      );

    case 'social-links':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Social Links')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Alignment')}</Label>
            <Select value={block.alignment} onValueChange={(v) => onChange({ ...block, alignment: v as 'left' | 'center' | 'right' })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">{t('Left')}</SelectItem>
                <SelectItem value="center">{t('Center')}</SelectItem>
                <SelectItem value="right">{t('Right')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Icon Size')}</Label>
            <Select value={String(block.iconSize)} onValueChange={(v) => onChange({ ...block, iconSize: parseInt(v) as 24 | 32 | 40 })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24px</SelectItem>
                <SelectItem value="32">32px</SelectItem>
                <SelectItem value="40">40px</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Icon Style')}</Label>
            <Select value={block.iconStyle} onValueChange={(v) => onChange({ ...block, iconStyle: v as 'colored' | 'dark' | 'light' })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="colored">{t('Colored')}</SelectItem>
                <SelectItem value="dark">{t('Dark')}</SelectItem>
                <SelectItem value="light">{t('Light')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Links list */}
          <div className="space-y-2">
            <Label className="text-xs">{t('Social Links')}</Label>
            {block.links.map((link, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Select
                  value={link.platform}
                  onValueChange={(v) => {
                    const newLinks = [...block.links];
                    newLinks[i] = { ...newLinks[i], platform: v as SocialPlatform };
                    onChange({ ...block, links: newLinks });
                  }}
                >
                  <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{SOCIAL_PLATFORM_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={link.url}
                  onChange={(e) => {
                    const newLinks = [...block.links];
                    newLinks[i] = { ...newLinks[i], url: e.target.value };
                    onChange({ ...block, links: newLinks });
                  }}
                  placeholder="URL..."
                  className="h-7 text-xs flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-destructive"
                  onClick={() => {
                    const newLinks = block.links.filter((_, j) => j !== i);
                    onChange({ ...block, links: newLinks });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 w-full"
              onClick={() => {
                const usedPlatforms = new Set(block.links.map((l) => l.platform));
                const nextPlatform = ALL_PLATFORMS.find((p) => !usedPlatforms.has(p)) || 'website';
                onChange({ ...block, links: [...block.links, { platform: nextPlatform, url: '' }] });
              }}
            >
              <Plus className="h-3 w-3" />
              {t('Add Platform')}
            </Button>
          </div>
        </div>
      );

    case 'columns':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Columns')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Column Count')}</Label>
            <Select value={String(block.columnCount)} onValueChange={(v) => {
              const count = parseInt(v) as 2 | 3;
              const columns = [...block.columns];
              while (columns.length < count) {
                columns.push({ blocks: [] });
              }
              onChange({ ...block, columnCount: count, columns });
            }}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 {t('Columns')}</SelectItem>
                <SelectItem value="3">3 {t('Columns')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Gap')} (px)</Label>
            <input
              type="range"
              min={0}
              max={32}
              value={block.gap}
              onChange={(e) => onChange({ ...block, gap: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{block.gap}px</span>
          </div>
        </div>
      );

    case 'hero':
      return (
        <div className="space-y-3 p-4 animate-panel-slide-in">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Hero')}</h4>
          <div className="space-y-1">
            <Label className="text-xs">{t('Title')}</Label>
            <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Subtitle')}</Label>
            <Input value={block.subtitle} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Background Image')}</Label>
            <Input value={block.backgroundImage} onChange={(e) => onChange({ ...block, backgroundImage: e.target.value })} placeholder="https://..." />
          </div>
          <ColorPickerField label={t('Background')} value={block.backgroundColor} onChange={(v) => onChange({ ...block, backgroundColor: v })} />
          <div className="space-y-1">
            <Label className="text-xs">{t('Overlay Opacity')}</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(block.overlayOpacity * 100)}
              onChange={(e) => onChange({ ...block, overlayOpacity: parseInt(e.target.value) / 100 })}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground">{Math.round(block.overlayOpacity * 100)}%</span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Min Height')} (px)</Label>
            <Input type="number" min={100} max={500} value={block.minHeight} onChange={(e) => onChange({ ...block, minHeight: parseInt(e.target.value) || 200 })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorPickerField label={t('Title') + ' ' + t('Color')} value={block.titleColor} onChange={(v) => onChange({ ...block, titleColor: v })} />
            <ColorPickerField label={t('Subtitle') + ' ' + t('Color')} value={block.subtitleColor} onChange={(v) => onChange({ ...block, subtitleColor: v })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('Alignment')}</Label>
            <Select value={block.alignment} onValueChange={(v) => onChange({ ...block, alignment: v as 'left' | 'center' | 'right' })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">{t('Left')}</SelectItem>
                <SelectItem value="center">{t('Center')}</SelectItem>
                <SelectItem value="right">{t('Right')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border-t pt-3 mt-3 space-y-3">
            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase">CTA</h5>
            <div className="space-y-1">
              <Label className="text-xs">{t('CTA Text')}</Label>
              <Input value={block.ctaText} onChange={(e) => onChange({ ...block, ctaText: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('CTA URL')}</Label>
              <Input value={block.ctaUrl} onChange={(e) => onChange({ ...block, ctaUrl: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ColorPickerField label={t('Background')} value={block.ctaBackgroundColor} onChange={(v) => onChange({ ...block, ctaBackgroundColor: v })} />
              <ColorPickerField label={t('Text Color')} value={block.ctaTextColor} onChange={(v) => onChange({ ...block, ctaTextColor: v })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('Border Radius')} (px)</Label>
              <Input type="number" min={0} max={50} value={block.ctaBorderRadius} onChange={(e) => onChange({ ...block, ctaBorderRadius: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
