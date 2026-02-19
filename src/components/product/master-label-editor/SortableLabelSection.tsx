import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { GripHorizontal, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { LabelSection, LabelElement, LabelElementType, LabelSectionId } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import type { SectionDragData } from './hooks/useLabelDndKit';
import { SortableLabelElement } from './SortableLabelElement';
import { LabelElementInsertHandle } from './LabelElementInsertHandle';

// Color-coded left border per section type
const SECTION_COLORS: Record<string, string> = {
  identity: '#3b82f6',     // blue
  dpp: '#8b5cf6',          // purple
  compliance: '#10b981',   // emerald
  sustainability: '#059669', // green
  custom: '#f97316',       // orange
  footer: '#6b7280',       // gray
  logistics: '#d97706',    // amber
  regulatory: '#ef4444',   // red
  'dpp-barcode': '#6366f1', // indigo
  packaging: '#14b8a6',    // teal
  handling: '#ec4899',     // pink
};

interface SortableLabelSectionProps {
  section: LabelSection;
  sectionIndex: number;
  elements: LabelElement[];
  data: MasterLabelData | null;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onSelectElement: (id: string) => void;
  onHoverElement: (id: string | null) => void;
  onMoveElement: (elementId: string, direction: 'up' | 'down') => void;
  onDuplicateElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onInsertElement: (type: LabelElementType, afterIndex: number) => void;
  onToggleCollapsed: () => void;
  isPartialContinuation?: boolean;
  isOverTarget?: boolean;
}

export function SortableLabelSection({
  section,
  sectionIndex,
  elements,
  data,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  onMoveElement,
  onDuplicateElement,
  onDeleteElement,
  onInsertElement,
  onToggleCollapsed,
  isPartialContinuation,
  isOverTarget,
}: SortableLabelSectionProps) {
  const { t } = useTranslation('products');

  // Make this section a droppable area for cross-section moves
  const sectionDragData: SectionDragData = {
    type: 'section',
    sectionId: section.id,
    index: sectionIndex,
  };

  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section.id}`,
    data: sectionDragData,
  });

  if (!section.visible) return null;

  const sortedElements = [...elements].sort((a, b) => a.sortOrder - b.sortOrder);
  const elementIds = sortedElements.map(e => e.id);
  const highlight = isOver || isOverTarget;
  const sectionColor = SECTION_COLORS[section.id] || '#6b7280';

  return (
    <div
      ref={setNodeRef}
      className={`group/section relative transition-colors ${highlight ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
      style={{
        paddingTop: `${section.paddingTop}px`,
        paddingBottom: `${section.paddingBottom}px`,
        borderBottomWidth: section.showBorder ? '0.5px' : 0,
        borderBottomColor: section.borderColor,
        borderBottomStyle: 'solid',
        marginBottom: section.showBorder ? '6px' : '3px',
        backgroundColor: section.backgroundColor || 'transparent',
        borderLeftWidth: '2px',
        borderLeftColor: sectionColor,
        borderLeftStyle: 'solid',
        paddingLeft: '4px',
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-1 mb-1 cursor-pointer select-none group/header">
        <GripHorizontal className="h-2.5 w-2.5 text-muted-foreground/40 opacity-0 group-hover/header:opacity-100 cursor-grab" />
        <button onClick={onToggleCollapsed} className="flex items-center gap-0.5">
          {section.collapsed ? (
            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/60" />
          ) : (
            <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/60" />
          )}
          <span className="text-[6px] font-bold uppercase tracking-wider" style={{ color: sectionColor }}>
            {t(section.label)}
            {isPartialContinuation && <span className="text-muted-foreground/50 ml-1">(cont.)</span>}
          </span>
        </button>
        <span className="text-[5px] text-muted-foreground/40 ml-auto opacity-0 group-hover/section:opacity-100 transition-opacity">
          {sortedElements.length}
        </span>
      </div>

      {/* Collapse/expand with CSS animation */}
      <div
        className="transition-[grid-template-rows] duration-200 ease-in-out"
        style={{
          display: 'grid',
          gridTemplateRows: section.collapsed ? '0fr' : '1fr',
        }}
      >
        <div className="overflow-hidden">
          <SortableContext items={elementIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {sortedElements.map((element, index) => (
                <div key={element.id}>
                  <SortableLabelElement
                    element={element}
                    sectionId={section.id}
                    index={index}
                    data={data}
                    isSelected={selectedElementId === element.id}
                    isHovered={hoveredElementId === element.id}
                    onSelect={() => onSelectElement(element.id)}
                    onHover={(hovering) => onHoverElement(hovering ? element.id : null)}
                    onMoveUp={() => onMoveElement(element.id, 'up')}
                    onMoveDown={() => onMoveElement(element.id, 'down')}
                    onDuplicate={() => onDuplicateElement(element.id)}
                    onDelete={() => onDeleteElement(element.id)}
                  />

                  {/* Insert handle between elements */}
                  <LabelElementInsertHandle
                    onInsert={(type) => onInsertElement(type, index)}
                  />
                </div>
              ))}

              {/* Empty section placeholder */}
              {sortedElements.length === 0 && (
                <div className="py-3 border border-dashed border-muted-foreground/20 rounded flex flex-col items-center justify-center gap-1">
                  <Plus className="h-3 w-3 text-muted-foreground/30" />
                  <span className="text-[7px] text-muted-foreground/40">{t('ml.editor.emptySection')}</span>
                  <LabelElementInsertHandle
                    onInsert={(type) => onInsertElement(type, -1)}
                  />
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}
