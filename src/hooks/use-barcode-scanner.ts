/**
 * Hardware Barcode Scanner Hook
 * Captures rapid keystroke input from USB/Bluetooth barcode scanners
 * Scanners emulate keyboards: send characters rapidly, then Enter
 */

import { useCallback, useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxIntervalMs?: number;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 4,
  maxIntervalMs = 80,
}: UseBarcodeScannerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  const focusInput = useCallback(() => {
    if (inputRef.current && enabled) {
      inputRef.current.focus();
    }
  }, [enabled]);

  // Handle input change (scanner types rapidly into the field)
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!enabled) return;
    bufferRef.current = e.target.value;
  }, [enabled]);

  // Handle keydown — detect Enter to fire scan
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastKey = now - lastKeystrokeRef.current;
    lastKeystrokeRef.current = now;

    // If too much time passed, this might be human typing — reset
    if (timeSinceLastKey > maxIntervalMs && bufferRef.current.length > 0 && e.key !== 'Enter') {
      // Allow the current character, but reset the old buffer
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const value = bufferRef.current.trim();
      if (value.length >= minLength) {
        onScan(value);
      }
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
    }

    // Clear reset timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // If buffer sits for too long without Enter, clear it
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
    }, 2000);
  }, [enabled, maxIntervalMs, minLength, onScan]);

  // Auto-focus the hidden input periodically
  useEffect(() => {
    if (!enabled) return;

    focusInput();

    const interval = setInterval(() => {
      // Only refocus if no other input/dialog has focus
      const active = document.activeElement;
      const isOtherInput = active && active !== inputRef.current &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
      if (!isOtherInput) {
        focusInput();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, focusInput]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    inputRef,
    inputProps: {
      ref: inputRef,
      onChange: handleInput,
      onKeyDown: handleKeyDown,
      autoFocus: true,
      tabIndex: -1,
      'aria-hidden': true as const,
      style: {
        position: 'absolute' as const,
        opacity: 0,
        width: '1px',
        height: '1px',
        overflow: 'hidden' as const,
        pointerEvents: 'none' as const,
      },
    },
    focusInput,
    resetBuffer,
  };
}
