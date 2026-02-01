import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Type, MousePointerClick, Minus, MoveVertical, Info, ImageIcon, Share2, Columns2, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { EmailBlockType } from './emailEditorTypes';

interface BlockInsertHandleProps {
  onInsert: (blockType: EmailBlockType) => void;
  onDragOver?: () => void;
  showDropZone?: boolean;
}

const INSERT_OPTIONS: Array<{ type: EmailBlockType; icon: typeof Type; label: string }> = [
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

export function BlockInsertHandle({ onInsert, onDragOver, showDropZone }: BlockInsertHandleProps) {
  const { t } = useTranslation('returns');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="group relative flex items-center justify-center py-1"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver?.();
      }}
    >
      {/* Drop zone indicator */}
      {showDropZone && (
        <div className="absolute inset-x-4 h-0.5 bg-primary rounded-full animate-drop-zone-glow" />
      )}

      {/* Line + plus button */}
      <div className="relative flex items-center w-full opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex-1 h-px bg-border" />
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:animate-insert-handle-pulse transition-all shadow-sm"
            >
              <Plus className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-2 animate-picker-fade-in" align="center">
            <p className="text-[10px] font-medium text-muted-foreground px-1 mb-1.5">{t('Insert Block')}</p>
            <div className="grid grid-cols-3 gap-1">
              {INSERT_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  className="flex flex-col items-center gap-0.5 p-2 rounded-md hover:bg-accent transition-colors"
                  onClick={() => {
                    onInsert(opt.type);
                    setIsOpen(false);
                  }}
                >
                  <opt.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">{t(opt.label)}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  );
}
