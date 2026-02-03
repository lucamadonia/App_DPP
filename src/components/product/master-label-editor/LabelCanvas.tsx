import { useTranslation } from 'react-i18next';
import type { LabelDesign, LabelElementType, LabelSectionId } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import { A6_WIDTH_PT, A6_HEIGHT_PT } from '@/lib/master-label-defaults';
import { LabelCanvasSection } from './LabelCanvasSection';

interface LabelCanvasProps {
  design: LabelDesign;
  data: MasterLabelData | null;
  zoom: number;
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onHoverElement: (id: string | null) => void;
  onMoveElement: (elementId: string, direction: 'up' | 'down') => void;
  onDuplicateElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onDragElementStart: (index: number) => void;
  onInsertElement: (type: LabelElementType, sectionId: LabelSectionId, afterIndex: number) => void;
  onToggleSectionCollapsed: (sectionId: LabelSectionId) => void;
  onSectionDragStart: (index: number) => void;
  dragTargetSectionIndex: number | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function LabelCanvas({
  design,
  data,
  zoom,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  onMoveElement,
  onDuplicateElement,
  onDeleteElement,
  onDragElementStart,
  onInsertElement,
  onToggleSectionCollapsed,
  onSectionDragStart,
  dragTargetSectionIndex,
  onDragOver,
  onDrop,
}: LabelCanvasProps) {
  const { t } = useTranslation('products');
  const scale = zoom / 100;

  // A6: 105mm x 148mm, rendered at ~2.66px per pt for screen preview
  const pxPerPt = 0.95;
  const canvasWidth = A6_WIDTH_PT * pxPerPt;
  const canvasHeight = A6_HEIGHT_PT * pxPerPt;

  const sortedSections = [...design.sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div
      className="flex items-start justify-center p-8"
      onClick={() => onSelectElement(null)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          padding: `${design.padding * pxPerPt}px`,
          backgroundColor: design.backgroundColor,
          fontFamily: design.fontFamily === 'Courier' ? 'monospace' : design.fontFamily === 'Times-Roman' ? 'serif' : 'sans-serif',
          fontSize: `${design.baseFontSize * 1.2}px`,
          color: design.baseTextColor,
        }}
        className="bg-white border border-gray-300 rounded shadow-md overflow-hidden"
      >
        {sortedSections.map((section, sectionIndex) => {
          const sectionElements = design.elements.filter(el => el.sectionId === section.id);

          return (
            <LabelCanvasSection
              key={section.id}
              section={section}
              elements={sectionElements}
              data={data}
              selectedElementId={selectedElementId}
              hoveredElementId={hoveredElementId}
              onSelectElement={onSelectElement}
              onHoverElement={onHoverElement}
              onMoveElement={onMoveElement}
              onDuplicateElement={onDuplicateElement}
              onDeleteElement={onDeleteElement}
              onDragElementStart={onDragElementStart}
              onInsertElement={(type, afterIndex) => onInsertElement(type, section.id, afterIndex)}
              onToggleCollapsed={() => onToggleSectionCollapsed(section.id)}
              onSectionDragStart={() => onSectionDragStart(sectionIndex)}
              isDragTarget={dragTargetSectionIndex === sectionIndex}
            />
          );
        })}

        {/* Empty state */}
        {design.elements.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded">
            <p className="text-[10px] text-muted-foreground text-center px-4">
              {t('ml.editor.emptyState')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
