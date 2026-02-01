import { useState, useCallback } from 'react';
import type { DragState, EmailBlockType } from '../emailEditorTypes';

const INITIAL_DRAG_STATE: DragState = {
  isDragging: false,
  sourceIndex: null,
  targetIndex: null,
  dragType: null,
  insertBlockType: null,
};

export function useDragReorder(blockCount: number) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_DRAG_STATE);

  const handleDragStart = useCallback((index: number) => {
    setDragState({
      isDragging: true,
      sourceIndex: index,
      targetIndex: null,
      dragType: 'reorder',
      insertBlockType: null,
    });
  }, []);

  const handleSidebarDragStart = useCallback((blockType: EmailBlockType) => {
    setDragState({
      isDragging: true,
      sourceIndex: null,
      targetIndex: null,
      dragType: 'insert',
      insertBlockType: blockType,
    });
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragState((prev) => {
      if (prev.targetIndex === index) return prev;
      return { ...prev, targetIndex: index };
    });
  }, []);

  const handleDrop = useCallback((targetIndex: number): { type: 'reorder'; from: number; to: number } | { type: 'insert'; blockType: EmailBlockType; at: number } | null => {
    const state = dragState;
    setDragState(INITIAL_DRAG_STATE);

    if (state.dragType === 'reorder' && state.sourceIndex !== null) {
      if (state.sourceIndex === targetIndex) return null;
      return { type: 'reorder', from: state.sourceIndex, to: targetIndex };
    }

    if (state.dragType === 'insert' && state.insertBlockType) {
      return { type: 'insert', blockType: state.insertBlockType, at: targetIndex };
    }

    return null;
  }, [dragState]);

  const handleDragEnd = useCallback(() => {
    setDragState(INITIAL_DRAG_STATE);
  }, []);

  return {
    dragState,
    handleDragStart,
    handleSidebarDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    blockCount,
  };
}
