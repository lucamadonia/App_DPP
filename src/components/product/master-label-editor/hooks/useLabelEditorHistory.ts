import { useState, useCallback, useRef } from 'react';
import type { LabelDesign, LabelEditorHistoryEntry } from '@/types/master-label-editor';

const MAX_HISTORY = 50;

export function useLabelEditorHistory(initialDesign: LabelDesign) {
  const [history, setHistory] = useState<LabelEditorHistoryEntry[]>([
    { design: initialDesign, timestamp: Date.now() },
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  const push = useCallback((design: LabelDesign) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    setHistory((prev) => {
      const truncated = prev.slice(0, currentIndex + 1);
      const newEntry: LabelEditorHistoryEntry = { design, timestamp: Date.now() };
      const next = [...truncated, newEntry];
      if (next.length > MAX_HISTORY) {
        next.shift();
        return next;
      }
      return next;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [currentIndex]);

  const undo = useCallback((): LabelEditorHistoryEntry | null => {
    if (currentIndex <= 0) return null;
    isUndoRedoRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [currentIndex, history]);

  const redo = useCallback((): LabelEditorHistoryEntry | null => {
    if (currentIndex >= history.length - 1) return null;
    isUndoRedoRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [currentIndex, history]);

  const reset = useCallback((design: LabelDesign) => {
    const entry: LabelEditorHistoryEntry = { design, timestamp: Date.now() };
    setHistory([entry]);
    setCurrentIndex(0);
  }, []);

  return {
    push,
    undo,
    redo,
    reset,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
  };
}
