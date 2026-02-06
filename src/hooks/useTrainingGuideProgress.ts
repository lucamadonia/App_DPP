import { useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'trackbliss-training-guide-progress';

export type ChapterId =
  | 'dashboard'
  | 'products'
  | 'dpp'
  | 'documents'
  | 'supply-chain'
  | 'compliance'
  | 'returns'
  | 'portals'
  | 'settings'
  | 'billing';

export const ALL_CHAPTERS: ChapterId[] = [
  'dashboard',
  'products',
  'dpp',
  'documents',
  'supply-chain',
  'compliance',
  'returns',
  'portals',
  'settings',
  'billing',
];

function loadProgress(): Set<ChapterId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as ChapterId[];
    return new Set(arr.filter((id) => ALL_CHAPTERS.includes(id)));
  } catch {
    return new Set();
  }
}

function saveProgress(completed: Set<ChapterId>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
}

export function useTrainingGuideProgress() {
  const [completed, setCompleted] = useState<Set<ChapterId>>(loadProgress);

  const toggleChapter = useCallback((id: ChapterId) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveProgress(next);
      return next;
    });
  }, []);

  const isCompleted = useCallback(
    (id: ChapterId) => completed.has(id),
    [completed]
  );

  const stats = useMemo(
    () => ({
      completedCount: completed.size,
      totalCount: ALL_CHAPTERS.length,
      percentage: Math.round((completed.size / ALL_CHAPTERS.length) * 100),
    }),
    [completed]
  );

  return { completed, toggleChapter, isCompleted, stats };
}
