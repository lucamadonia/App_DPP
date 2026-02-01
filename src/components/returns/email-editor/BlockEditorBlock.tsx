import { useTranslation } from 'react-i18next';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { EmailBlock } from './emailEditorTypes';

interface BlockEditorBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onChange: (block: EmailBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BlockPreview({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{block.content}</p>;
    case 'button':
      return (
        <div className={`text-${block.alignment}`}>
          <span
            className="inline-block px-4 py-1.5 rounded text-xs font-medium"
            style={{ backgroundColor: block.backgroundColor, color: block.textColor, borderRadius: block.borderRadius }}
          >
            {block.text}
          </span>
        </div>
      );
    case 'divider':
      return <hr style={{ borderColor: block.color, borderWidth: block.thickness }} />;
    case 'spacer':
      return <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: Math.min(block.height, 40) }}>↕ {block.height}px</div>;
    case 'info-box':
      return (
        <div className="rounded border px-3 py-2" style={{ backgroundColor: block.backgroundColor, borderColor: block.borderColor }}>
          <span className="text-[10px] uppercase text-muted-foreground">{block.label}</span>
          <p className="text-sm font-medium">{block.value}</p>
        </div>
      );
    default:
      return null;
  }
}

function BlockSettings({ block, onChange }: { block: EmailBlock; onChange: (b: EmailBlock) => void }) {
  const { t } = useTranslation('returns');

  switch (block.type) {
    case 'text':
      return (
        <div className="space-y-2">
          <Label>{t('Content')}</Label>
          <Textarea
            value={block.content}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            rows={4}
            className="font-mono text-sm"
          />
        </div>
      );

    case 'button':
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t('Button Text')}</Label>
            <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>URL</Label>
            <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>{t('Background')}</Label>
              <div className="flex gap-1">
                <input type="color" value={block.backgroundColor} onChange={(e) => onChange({ ...block, backgroundColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                <Input value={block.backgroundColor} onChange={(e) => onChange({ ...block, backgroundColor: e.target.value })} className="text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('Text Color')}</Label>
              <div className="flex gap-1">
                <input type="color" value={block.textColor} onChange={(e) => onChange({ ...block, textColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                <Input value={block.textColor} onChange={(e) => onChange({ ...block, textColor: e.target.value })} className="text-xs" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'divider':
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>{t('Color')}</Label>
            <div className="flex gap-1">
              <input type="color" value={block.color} onChange={(e) => onChange({ ...block, color: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
              <Input value={block.color} onChange={(e) => onChange({ ...block, color: e.target.value })} className="text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('Thickness')}</Label>
            <Input type="number" min={1} max={5} value={block.thickness} onChange={(e) => onChange({ ...block, thickness: parseInt(e.target.value) || 1 })} />
          </div>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-1">
          <Label>{t('Height')} (px)</Label>
          <Input type="number" min={4} max={80} value={block.height} onChange={(e) => onChange({ ...block, height: parseInt(e.target.value) || 16 })} />
        </div>
      );

    case 'info-box':
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t('Label')}</Label>
            <Input value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{t('Value')}</Label>
            <Input value={block.value} onChange={(e) => onChange({ ...block, value: e.target.value })} className="font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>{t('Background')}</Label>
              <div className="flex gap-1">
                <input type="color" value={block.backgroundColor} onChange={(e) => onChange({ ...block, backgroundColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                <Input value={block.backgroundColor} onChange={(e) => onChange({ ...block, backgroundColor: e.target.value })} className="text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('Border')}</Label>
              <div className="flex gap-1">
                <input type="color" value={block.borderColor} onChange={(e) => onChange({ ...block, borderColor: e.target.value })} className="h-8 w-10 rounded border cursor-pointer" />
                <Input value={block.borderColor} onChange={(e) => onChange({ ...block, borderColor: e.target.value })} className="text-xs" />
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  button: 'Button',
  divider: 'Divider',
  spacer: 'Spacer',
  'info-box': 'Info Box',
};

export function BlockEditorBlock({
  block,
  isSelected,
  isFirst,
  isLast,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: BlockEditorBlockProps) {
  return (
    <div
      className={`rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20 animate-[selected-glow_2s_ease-in-out_infinite]'
          : 'border-border hover:border-primary/40'
      }`}
      onClick={onSelect}
    >
      {/* Block header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/30 rounded-t-lg">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground flex-1">{BLOCK_TYPE_LABELS[block.type]}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isFirst} onClick={(e) => { e.stopPropagation(); onMoveUp(); }}>
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isLast} onClick={(e) => { e.stopPropagation(); onMoveDown(); }}>
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
          <Copy className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Block preview */}
      <div className="px-4 py-3">
        <BlockPreview block={block} />
      </div>

      {/* Block settings (when selected) */}
      {isSelected && (
        <div className="px-4 py-3 border-t bg-muted/10 animate-[block-insert_0.2s_ease-out]">
          <BlockSettings block={block} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
