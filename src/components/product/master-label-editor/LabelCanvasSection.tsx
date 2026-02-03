import { useTranslation } from 'react-i18next';
import { GripHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
import type { LabelSection, LabelElement, LabelElementType } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import { LabelCanvasElement } from './LabelCanvasElement';
import { LabelElementInsertHandle } from './LabelElementInsertHandle';

interface LabelCanvasSectionProps {
  section: LabelSection;
  elements: LabelElement[];
  data: MasterLabelData | null;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onSelectElement: (id: string) => void;
  onHoverElement: (id: string | null) => void;
  onMoveElement: (elementId: string, direction: 'up' | 'down') => void;
  onDuplicateElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onDragElementStart: (index: number) => void;
  onInsertElement: (type: LabelElementType, afterIndex: number) => void;
  onToggleCollapsed: () => void;
  onSectionDragStart: () => void;
  isDragTarget: boolean;
}

export function LabelCanvasSection({
  section,
  elements,
  data,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  onMoveElement,
  onDuplicateElement,
  onDeleteElement,
  onDragElementStart,
  onInsertElement,
  onToggleCollapsed,
  onSectionDragStart,
  isDragTarget,
}: LabelCanvasSectionProps) {
  const { t } = useTranslation('products');

  if (!section.visible) return null;

  const sortedElements = [...elements].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div
      className={`group/section relative ${isDragTarget ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
      style={{
        paddingTop: `${section.paddingTop}px`,
        paddingBottom: `${section.paddingBottom}px`,
        borderBottomWidth: section.showBorder ? '0.5px' : 0,
        borderBottomColor: section.borderColor,
        borderBottomStyle: 'solid',
        marginBottom: section.showBorder ? '6px' : '3px',
        backgroundColor: section.backgroundColor || 'transparent',
      }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-1 mb-1 cursor-pointer select-none group/header"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onSectionDragStart();
        }}
      >
        <GripHorizontal className="h-2.5 w-2.5 text-muted-foreground/40 opacity-0 group-hover/header:opacity-100 cursor-grab" />
        <button onClick={onToggleCollapsed} className="flex items-center gap-0.5">
          {section.collapsed ? (
            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/60" />
          ) : (
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/60" />
          )}
          <span className="text-[6px] font-bold text-gray-500 uppercase tracking-wider">
            {t(section.label)}
          </span>
        </button>
      </div>

      {/* Elements */}
      {!section.collapsed && (
        <div className="space-y-0.5">
          {sortedElements.map((element, index) => (
            <div key={element.id}>
              <LabelCanvasElement
                element={element}
                data={data}
                isSelected={selectedElementId === element.id}
                isHovered={hoveredElementId === element.id}
                onSelect={() => onSelectElement(element.id)}
                onHover={(hovering) => onHoverElement(hovering ? element.id : null)}
                onMoveUp={() => onMoveElement(element.id, 'up')}
                onMoveDown={() => onMoveElement(element.id, 'down')}
                onDuplicate={() => onDuplicateElement(element.id)}
                onDelete={() => onDeleteElement(element.id)}
                onDragStart={() => onDragElementStart(index)}
              />

              {/* Insert handle between elements */}
              <LabelElementInsertHandle
                onInsert={(type) => onInsertElement(type, index)}
              />
            </div>
          ))}

          {/* Insert handle at end of empty section */}
          {sortedElements.length === 0 && (
            <div className="py-2 border border-dashed border-muted-foreground/20 rounded flex items-center justify-center">
              <LabelElementInsertHandle
                onInsert={(type) => onInsertElement(type, -1)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
