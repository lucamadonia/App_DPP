/**
 * @dnd-kit based drag-and-drop hook for the Master Label Editor.
 *
 * Handles three drag types:
 * 1. Element reorder within a section (sortable)
 * 2. Element move across sections (custom)
 * 3. New element insert from palette (draggable → droppable section)
 *
 * All index resolution uses element IDs against design.elements
 * to produce full-section indices (correct across page-break slices).
 */

import { useState, useCallback } from 'react';
import {
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type {
  LabelDesign,
  LabelElement,
  LabelElementType,
  LabelSectionId,
} from '@/types/master-label-editor';

// ---------------------------------------------------------------------------
// Drag data types
// ---------------------------------------------------------------------------

export interface ElementDragData {
  type: 'element';
  element: LabelElement;
  sectionId: string;
  index: number;
}

export interface PaletteDragData {
  type: 'palette';
  elementType: LabelElementType;
}

export interface SectionDragData {
  type: 'section';
  sectionId: string;
  index: number;
}

export type LabelDragData = ElementDragData | PaletteDragData | SectionDragData;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseLabelDndKitOptions {
  design: LabelDesign;
  onReorderElement: (sectionId: string, fromIndex: number, toIndex: number) => void;
  onMoveElementToSection: (elementId: string, fromSection: string, toSection: string, toIndex: number) => void;
  onInsertElement: (type: LabelElementType, sectionId: LabelSectionId, atIndex: number) => void;
  onReorderSections: (fromIndex: number, toIndex: number) => void;
}

export function useLabelDndKit({
  design,
  onReorderElement,
  onMoveElementToSection,
  onInsertElement,
  onReorderSections,
}: UseLabelDndKitOptions) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<LabelDragData | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
    setActiveDragData((active.data?.current as LabelDragData) || null);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverSectionId(null);
      return;
    }

    // Determine which section the cursor is over
    const overData = over.data?.current as LabelDragData | undefined;
    if (overData?.type === 'element') {
      setOverSectionId(overData.sectionId);
    } else if (overData?.type === 'section') {
      setOverSectionId(overData.sectionId);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragData(null);
    setOverSectionId(null);

    if (!over) return;

    const activeData = active.data?.current as LabelDragData | undefined;
    const overData = over.data?.current as LabelDragData | undefined;

    if (!activeData) return;

    // Helper: get sorted section elements from full design
    const getSectionElements = (sectionId: string) =>
      design.elements
        .filter(e => e.sectionId === sectionId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    // ---- Case 1: Element dropped on element ----
    if (activeData.type === 'element' && overData?.type === 'element') {
      const activeElId = String(active.id);
      const overElId = String(over.id);

      if (activeData.sectionId === overData.sectionId) {
        // Same section: reorder using full-section indices
        const sectionElements = getSectionElements(activeData.sectionId);
        const fromIdx = sectionElements.findIndex(e => e.id === activeElId);
        const toIdx = sectionElements.findIndex(e => e.id === overElId);
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          onReorderElement(activeData.sectionId, fromIdx, toIdx);
        }
      } else {
        // Cross-section move: resolve target index in full target section
        const toElements = getSectionElements(overData.sectionId);
        const toIdx = toElements.findIndex(e => e.id === overElId);
        onMoveElementToSection(
          activeElId,
          activeData.sectionId,
          overData.sectionId,
          toIdx >= 0 ? toIdx : toElements.length,
        );
      }
      return;
    }

    // ---- Case 2: Element dropped on section droppable (cross-section, append) ----
    if (activeData.type === 'element' && overData?.type === 'section') {
      if (activeData.sectionId !== overData.sectionId) {
        const toElements = getSectionElements(overData.sectionId);
        onMoveElementToSection(
          String(active.id),
          activeData.sectionId,
          overData.sectionId,
          toElements.length,
        );
      }
      return;
    }

    // ---- Case 3: Palette item dropped ----
    if (activeData.type === 'palette') {
      let targetSection: string | undefined;
      let targetIndex = -1;

      if (overData?.type === 'element') {
        targetSection = overData.sectionId;
        const sectionElements = getSectionElements(overData.sectionId);
        targetIndex = sectionElements.findIndex(e => e.id === String(over.id));
      } else if (overData?.type === 'section') {
        targetSection = overData.sectionId;
        targetIndex = -1; // append
      }

      if (targetSection) {
        onInsertElement(activeData.elementType, targetSection as LabelSectionId, targetIndex);
      }
      return;
    }

    // ---- Case 4: Section reorder ----
    if (activeData.type === 'section' && overData?.type === 'section') {
      if (activeData.index !== overData.index) {
        onReorderSections(activeData.index, overData.index);
      }
    }
  }, [design, onReorderElement, onMoveElementToSection, onInsertElement, onReorderSections]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveDragData(null);
    setOverSectionId(null);
  }, []);

  // Find the active element for the drag overlay
  const activeElement = activeId && activeDragData?.type === 'element'
    ? design.elements.find(e => e.id === activeId) || null
    : null;

  return {
    sensors,
    activeId,
    activeDragData,
    activeElement,
    overSectionId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
