import { useTranslation } from 'react-i18next';
import { GripVertical, ChevronUp, ChevronDown, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingBlockToolbarProps {
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragHandleMouseDown: () => void;
}

export function FloatingBlockToolbar({
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDragHandleMouseDown,
}: FloatingBlockToolbarProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <div className="flex flex-col items-center bg-background rounded-lg border shadow-md p-0.5">
        <button
          type="button"
          className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
          onMouseDown={onDragHandleMouseDown}
          title={t('Drag to reorder')}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={isFirst}
          onClick={onMoveUp}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={isLast}
          onClick={onMoveDown}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDuplicate}
          title={t('Duplicate')}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={onDelete}
          title={t('Delete Block')}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
