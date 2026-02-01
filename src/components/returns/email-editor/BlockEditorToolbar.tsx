import { useTranslation } from 'react-i18next';
import { Type, MousePointerClick, Minus, MoveVertical, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EmailBlock, EmailBlockType } from './emailEditorTypes';

interface BlockEditorToolbarProps {
  onAddBlock: (block: EmailBlock) => void;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const BLOCK_OPTIONS: Array<{ type: EmailBlockType; icon: typeof Type; label: string }> = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'button', icon: MousePointerClick, label: 'Button' },
  { type: 'divider', icon: Minus, label: 'Divider' },
  { type: 'spacer', icon: MoveVertical, label: 'Spacer' },
  { type: 'info-box', icon: Info, label: 'Info Box' },
];

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
  }
}

export function BlockEditorToolbar({ onAddBlock }: BlockEditorToolbarProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="flex items-center gap-1 p-2 border rounded-lg bg-muted/30">
      <span className="text-xs font-medium text-muted-foreground mr-2">{t('Add Block')}:</span>
      {BLOCK_OPTIONS.map((opt) => (
        <Button
          key={opt.type}
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={() => onAddBlock(createDefaultBlock(opt.type))}
        >
          <opt.icon className="h-3.5 w-3.5" />
          {t(opt.label)}
        </Button>
      ))}
    </div>
  );
}
