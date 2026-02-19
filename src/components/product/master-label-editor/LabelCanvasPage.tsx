import { useTranslation } from 'react-i18next';
import type { LabelDesign, LabelElementType, LabelSectionId } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import type { SectionSlice } from '@/lib/master-label-page-break';
import { A6_WIDTH_PX, A6_HEIGHT_PX, PT_TO_PX } from '@/lib/master-label-defaults';
import { SortableLabelSection } from './SortableLabelSection';

interface LabelCanvasPageProps {
  design: LabelDesign;
  data: MasterLabelData | null;
  pageIndex: number;
  totalPages: number;
  sections: SectionSlice[];
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onHoverElement: (id: string | null) => void;
  onMoveElement: (elementId: string, direction: 'up' | 'down') => void;
  onDuplicateElement: (elementId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onInsertElement: (type: LabelElementType, sectionId: LabelSectionId, afterIndex: number) => void;
  onToggleSectionCollapsed: (sectionId: LabelSectionId) => void;
}

export function LabelCanvasPage({
  design,
  data,
  pageIndex,
  totalPages,
  sections,
  selectedElementId,
  hoveredElementId,
  onSelectElement,
  onHoverElement,
  onMoveElement,
  onDuplicateElement,
  onDeleteElement,
  onInsertElement,
  onToggleSectionCollapsed,
}: LabelCanvasPageProps) {
  const { t } = useTranslation('products');

  return (
    <div className="relative">
      {/* Page badge */}
      {totalPages > 1 && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground text-[9px] font-medium px-2 py-0.5 rounded-full shadow-sm">
          {t('ml.editor.pageOf', { current: pageIndex + 1, total: totalPages })}
        </div>
      )}

      <div
        style={{
          width: `${A6_WIDTH_PX}px`,
          minHeight: `${A6_HEIGHT_PX}px`,
          padding: `${design.padding * PT_TO_PX}px`,
          backgroundColor: design.backgroundColor,
          fontFamily: design.fontFamily === 'Courier' ? 'monospace' : design.fontFamily === 'Times-Roman' ? 'serif' : 'sans-serif',
          fontSize: `${design.baseFontSize * PT_TO_PX}px`,
          color: design.baseTextColor,
        }}
        className="bg-white border border-gray-300 rounded shadow-md overflow-hidden"
      >
        {sections.map((slice) => {
          // Get elements for this slice
          const allSectionElements = design.elements
            .filter(el => el.sectionId === slice.sectionId)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const sliceElements = allSectionElements.slice(
            slice.elementRange[0],
            slice.elementRange[1],
          );

          // Find the global section index for drag target tracking
          const sectionIndex = design.sections
            .filter(s => s.visible)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .findIndex(s => s.id === slice.sectionId);

          return (
            <SortableLabelSection
              key={`${slice.sectionId}-${slice.elementRange[0]}`}
              section={slice.section}
              sectionIndex={sectionIndex}
              elements={sliceElements}
              data={data}
              selectedElementId={selectedElementId}
              hoveredElementId={hoveredElementId}
              onSelectElement={(id) => onSelectElement(id)}
              onHoverElement={onHoverElement}
              onMoveElement={onMoveElement}
              onDuplicateElement={onDuplicateElement}
              onDeleteElement={onDeleteElement}
              onInsertElement={(type, afterIndex) => onInsertElement(type, slice.sectionId, slice.elementRange[0] + afterIndex)}
              onToggleCollapsed={() => onToggleSectionCollapsed(slice.sectionId)}
              isPartialContinuation={slice.isPartial && slice.elementRange[0] > 0}
            />
          );
        })}

        {/* Empty page state */}
        {sections.length === 0 && (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded">
            <p className="text-[10px] text-muted-foreground text-center px-4">
              {t('ml.editor.emptyState')}
            </p>
          </div>
        )}
      </div>

      {/* Page boundary dashed line */}
      {totalPages > 1 && pageIndex < totalPages - 1 && (
        <div className="border-b-2 border-dashed border-muted-foreground/20 mt-2" />
      )}
    </div>
  );
}
