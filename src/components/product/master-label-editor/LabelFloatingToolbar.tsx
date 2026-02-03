import { GripVertical, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';

interface LabelFloatingToolbarProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function LabelFloatingToolbar({ onMoveUp, onMoveDown, onDuplicate, onDelete }: LabelFloatingToolbarProps) {
  return (
    <div className="absolute -right-1 top-0 -translate-y-1/2 flex items-center gap-0.5 bg-background border rounded-md shadow-md p-0.5 z-10">
      <button className="p-0.5 hover:bg-muted rounded cursor-grab" title="Drag">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>
      <button className="p-0.5 hover:bg-muted rounded" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} title="Move up">
        <ArrowUp className="h-3 w-3 text-muted-foreground" />
      </button>
      <button className="p-0.5 hover:bg-muted rounded" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} title="Move down">
        <ArrowDown className="h-3 w-3 text-muted-foreground" />
      </button>
      <button className="p-0.5 hover:bg-muted rounded" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">
        <Copy className="h-3 w-3 text-muted-foreground" />
      </button>
      <button className="p-0.5 hover:bg-destructive/10 rounded" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
        <Trash2 className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
}
