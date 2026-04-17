/**
 * Scan Session Hook
 * Manages scan history, counters, and undo for a warehouse scanning session
 */

import { useCallback, useState } from 'react';

export interface ScanSessionEntry {
  id: string;
  timestamp: Date;
  mode: 'in' | 'out';
  productName: string;
  batchSerial: string;
  quantity: number;
  locationName: string;
  stockLevelId?: string;
  undone?: boolean;
}

export function useScanSession() {
  const [entries, setEntries] = useState<ScanSessionEntry[]>([]);

  const addEntry = useCallback((entry: Omit<ScanSessionEntry, 'id' | 'timestamp'>) => {
    const newEntry: ScanSessionEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setEntries(prev => [newEntry, ...prev]);
  }, []);

  const undoLast = useCallback(async (
    onUndo: (entry: ScanSessionEntry) => Promise<void>,
  ) => {
    const lastActive = entries.find(e => !e.undone);
    if (!lastActive) return;

    await onUndo(lastActive);
    setEntries(prev =>
      prev.map(e => e.id === lastActive.id ? { ...e, undone: true } : e),
    );
  }, [entries]);

  const clearSession = useCallback(() => {
    setEntries([]);
  }, []);

  const activeEntries = entries.filter(e => !e.undone);
  const totalIn = activeEntries.filter(e => e.mode === 'in').reduce((sum, e) => sum + e.quantity, 0);
  const totalOut = activeEntries.filter(e => e.mode === 'out').reduce((sum, e) => sum + e.quantity, 0);

  return {
    entries,
    activeEntries,
    totalIn,
    totalOut,
    totalCount: activeEntries.length,
    addEntry,
    undoLast,
    clearSession,
  };
}
