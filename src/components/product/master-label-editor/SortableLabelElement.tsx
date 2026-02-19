import { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LabelElement } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import type { ElementDragData } from './hooks/useLabelDndKit';
import { useLabelEditor } from './LabelEditorContext';
import { LabelCanvasElement } from './LabelCanvasElement';

interface SortableLabelElementProps {
  element: LabelElement;
  sectionId: string;
  index: number;
  data: MasterLabelData | null;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SortableLabelElement({
  element,
  sectionId,
  index,
  data,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: SortableLabelElementProps) {
  const { updateElement } = useLabelEditor();

  const dragData: ElementDragData = {
    type: 'element',
    element,
    sectionId,
    index,
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: element.id,
    data: dragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
  };

  // Inline edit callback — updates text content for text/icon-text elements
  const handleContentChange = useCallback((text: string) => {
    if (element.type === 'text') {
      updateElement({ ...element, content: text });
    } else if (element.type === 'icon-text') {
      updateElement({ ...element, text });
    }
  }, [element, updateElement]);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <LabelCanvasElement
        element={element}
        data={data}
        isSelected={isSelected}
        isHovered={isHovered}
        onSelect={onSelect}
        onHover={onHover}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        dragListeners={listeners}
        isDragging={isDragging}
        onContentChange={handleContentChange}
      />

      {/* Drop insertion indicator */}
      {isDragging && (
        <div className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary rounded-full" />
      )}
    </div>
  );
}
