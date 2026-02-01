import { useTranslation } from 'react-i18next';
import {
  Type, MousePointerClick, Minus, MoveVertical, Info,
  ImageIcon, Share2, Columns2, Sparkles,
} from 'lucide-react';
import type { EmailBlockType } from './emailEditorTypes';

interface BlockInsertSidebarProps {
  onDragStart: (blockType: EmailBlockType) => void;
  onAddBlock: (blockType: EmailBlockType) => void;
}

const BLOCK_OPTIONS: Array<{ type: EmailBlockType; icon: typeof Type; label: string }> = [
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'button', icon: MousePointerClick, label: 'Button' },
  { type: 'divider', icon: Minus, label: 'Divider' },
  { type: 'spacer', icon: MoveVertical, label: 'Spacer' },
  { type: 'info-box', icon: Info, label: 'Info Box' },
  { type: 'hero', icon: Sparkles, label: 'Hero' },
  { type: 'columns', icon: Columns2, label: 'Columns' },
  { type: 'social-links', icon: Share2, label: 'Social' },
];

export function BlockInsertSidebar({ onDragStart, onAddBlock }: BlockInsertSidebarProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="py-2 px-1.5 space-y-1">
      {BLOCK_OPTIONS.map((opt) => (
        <button
          key={opt.type}
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', opt.type);
            e.dataTransfer.effectAllowed = 'copy';
            onDragStart(opt.type);
          }}
          onClick={() => onAddBlock(opt.type)}
          className="w-full flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-grab active:cursor-grabbing group"
          title={t(opt.label)}
        >
          <opt.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-medium leading-tight text-center">{t(opt.label)}</span>
        </button>
      ))}
    </div>
  );
}
