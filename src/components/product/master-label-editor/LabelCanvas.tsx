import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import type { LabelDesign, LabelElementType, LabelSectionId } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import { calculatePageBreaks } from '@/lib/master-label-page-break';
import { useLabelDndKit } from './hooks/useLabelDndKit';
import { LabelCanvasPage } from './LabelCanvasPage';
import { LabelCanvasElement } from './LabelCanvasElement';

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
  onInsertElement: (type: LabelElementType, sectionId: LabelSectionId, afterIndex: number) => void;
  onToggleSectionCollapsed: (sectionId: LabelSectionId) => void;
  // @dnd-kit mutation callbacks (optional — omit for read-only preview)
  onReorderElement?: (sectionId: string, fromIndex: number, toIndex: number) => void;
  onMoveElementToSection?: (elementId: string, fromSection: string, toSection: string, toIndex: number) => void;
  onReorderSections?: (fromIndex: number, toIndex: number) => void;
  // Palette HTML5 DnD (optional — for canvas-level palette drops)
  onCanvasDragOver?: (e: React.DragEvent) => void;
  onCanvasDrop?: (e: React.DragEvent) => void;
  // Zoom (optional — for Ctrl+Scroll zoom)
  onZoomChange?: (zoom: number) => void;
}

const noop = () => {};

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
  onInsertElement,
  onToggleSectionCollapsed,
  onReorderElement,
  onMoveElementToSection,
  onReorderSections,
  onCanvasDragOver,
  onCanvasDrop,
  onZoomChange,
}: LabelCanvasProps) {
  const { t } = useTranslation('products');
  const scale = zoom / 100;

  // @dnd-kit hook — uses no-op callbacks when in preview mode
  const dndKit = useLabelDndKit({
    design,
    onReorderElement: onReorderElement || noop as any,
    onMoveElementToSection: onMoveElementToSection || noop as any,
    onInsertElement,
    onReorderSections: onReorderSections || noop as any,
  });

  // Calculate page breaks
  const pageBreaks = useMemo(
    () => calculatePageBreaks(design),
    [design],
  );

  const totalPages = pageBreaks.pages.length;

  // Disable sensors when in preview/read-only mode (no callbacks provided)
  const isInteractive = !!onReorderElement;

  // Ctrl+Scroll zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!onZoomChange || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    const newZoom = Math.min(200, Math.max(50, zoom + delta));
    onZoomChange(newZoom);
  }, [zoom, onZoomChange]);

  return (
    <DndContext
      sensors={isInteractive ? dndKit.sensors : undefined}
      collisionDetection={closestCenter}
      onDragStart={dndKit.handleDragStart}
      onDragOver={dndKit.handleDragOver}
      onDragEnd={dndKit.handleDragEnd}
      onDragCancel={dndKit.handleDragCancel}
    >
      <div
        className="flex flex-col items-center gap-8 p-8"
        onClick={() => onSelectElement(null)}
        onDragOver={onCanvasDragOver}
        onDrop={onCanvasDrop}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
          className="flex flex-col gap-8"
        >
          {pageBreaks.pages.map((page) => (
            <LabelCanvasPage
              key={page.pageIndex}
              design={design}
              data={data}
              pageIndex={page.pageIndex}
              totalPages={totalPages}
              sections={page.sections}
              selectedElementId={selectedElementId}
              hoveredElementId={hoveredElementId}
              onSelectElement={onSelectElement}
              onHoverElement={onHoverElement}
              onMoveElement={onMoveElement}
              onDuplicateElement={onDuplicateElement}
              onDeleteElement={onDeleteElement}
              onInsertElement={onInsertElement}
              onToggleSectionCollapsed={onToggleSectionCollapsed}
            />
          ))}
        </div>

        {/* Page count indicator */}
        {totalPages > 1 && (
          <div className="text-xs text-muted-foreground">
            {t('ml.editor.totalPages', { count: totalPages })}
          </div>
        )}
      </div>

      {/* Drag overlay — semi-transparent clone of dragged element */}
      <DragOverlay dropAnimation={null}>
        {dndKit.activeElement && (
          <div
            className="shadow-lg rounded-sm ring-2 ring-primary pointer-events-none"
            style={{ transform: 'scale(1.02)', opacity: 0.85 }}
          >
            <LabelCanvasElement
              element={dndKit.activeElement}
              data={data}
              isSelected={false}
              isHovered={false}
              onSelect={noop}
              onHover={noop}
              onMoveUp={noop}
              onMoveDown={noop}
              onDuplicate={noop}
              onDelete={noop}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
