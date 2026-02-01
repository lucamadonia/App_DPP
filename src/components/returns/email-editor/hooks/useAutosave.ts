import { useState, useEffect, useRef, useCallback } from 'react';
import type { SaveStatus } from '../emailEditorTypes';

export function useAutosave(
  saveFn: () => Promise<void>,
  hasChanges: boolean,
  debounceMs = 2000,
) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  useEffect(() => {
    if (!hasChanges) return;
    setStatus('unsaved');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFnRef.current();
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [hasChanges, debounceMs]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('saving');
    try {
      await saveFnRef.current();
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, []);

  const markSaved = useCallback(() => {
    setStatus('saved');
  }, []);

  return { status, saveNow, markSaved };
}
