import { useState, useCallback } from 'react';
import type { LabelDragState, LabelElementType } from '@/types/master-label-editor';

const INITIAL_DRAG_STATE: LabelDragState = {
  isDragging: false,
  sourceIndex: null,
  targetIndex: null,
  dragType: null,
  insertElementType: null,
};

export function useLabelDragReorder() {
  const [dragState, setDragState] = useState<LabelDragState>(INITIAL_DRAG_STATE);

  const handleDragStart = useCallback((index: number) => {
    setDragState({
      isDragging: true,
      sourceIndex: index,
      targetIndex: null,
      dragType: 'reorder',
      insertElementType: null,
    });
  }, []);

  const handleSectionDragStart = useCallback((index: number) => {
    setDragState({
      isDragging: true,
      sourceIndex: index,
      targetIndex: null,
      dragType: 'section-reorder',
      insertElementType: null,
    });
  }, []);

  const handlePaletteDragStart = useCallback((elementType: LabelElementType) => {
    setDragState({
      isDragging: true,
      sourceIndex: null,
      targetIndex: null,
      dragType: 'insert',
      insertElementType: elementType,
    });
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragState((prev) => {
      if (prev.targetIndex === index) return prev;
      return { ...prev, targetIndex: index };
    });
  }, []);

  const handleDrop = useCallback((targetIndex: number):
    | { type: 'reorder'; from: number; to: number }
    | { type: 'insert'; elementType: LabelElementType; at: number }
    | { type: 'section-reorder'; from: number; to: number }
    | null => {
    const state = dragState;
    setDragState(INITIAL_DRAG_STATE);

    if (state.dragType === 'reorder' && state.sourceIndex !== null) {
      if (state.sourceIndex === targetIndex) return null;
      return { type: 'reorder', from: state.sourceIndex, to: targetIndex };
    }

    if (state.dragType === 'section-reorder' && state.sourceIndex !== null) {
      if (state.sourceIndex === targetIndex) return null;
      return { type: 'section-reorder', from: state.sourceIndex, to: targetIndex };
    }

    if (state.dragType === 'insert' && state.insertElementType) {
      return { type: 'insert', elementType: state.insertElementType, at: targetIndex };
    }

    return null;
  }, [dragState]);

  const handleDragEnd = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  return {
    dragState,
    handleDragStart,
    handleSectionDragStart,
    handlePaletteDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
