/**
 * Hardware Barcode Scanner Hook
 *
 * Captures rapid keystroke input from USB/Bluetooth barcode scanners.
 * Scanners emulate keyboards: send characters rapidly, then Enter.
 *
 * Two capture paths:
 *   1. Hidden input (desktop): auto-focused, receives keystrokes directly
 *   2. Document-level listener (mobile + fallback): catches keystrokes when
 *      no regular input is focused — works for Bluetooth HID scanners paired
 *      with phones/tablets where we cannot auto-focus (would pop the keyboard).
 *
 * Buffer is built from KeyboardEvent.key so it works regardless of the
 * hidden input's readOnly state.
 */

import { useCallback, useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxIntervalMs?: number;
}

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchDevice = isTouchDevice();

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const focusInput = useCallback(() => {
    if (inputRef.current && enabled && !touchDevice) {
      inputRef.current.focus();
    }
  }, [enabled, touchDevice]);

  // Core key processor — works for both input-level and document-level events.
  // Returns true if the key was consumed (Enter with valid scan).
  const processKey = useCallback((
    key: string,
    opts: { ctrl?: boolean; meta?: boolean; alt?: boolean } = {}
  ): 'fire' | 'buffer' | 'ignore' => {
    if (!enabled) return 'ignore';
    if (opts.ctrl || opts.meta || opts.alt) return 'ignore';

    const now = Date.now();
    const timeSinceLast = now - lastKeystrokeRef.current;
    lastKeystrokeRef.current = now;

    // Human typing gap — reset any stale buffer unless we're finishing with Enter
    if (timeSinceLast > maxIntervalMs && bufferRef.current.length > 0 && key !== 'Enter') {
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
    }

    if (key === 'Enter') {
      const value = bufferRef.current.trim();
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
      if (value.length >= minLength) {
        onScan(value);
        return 'fire';
      }
      return 'ignore';
    }

    // Append printable single-character keys directly to the buffer.
    // This is critical: works even when the hidden input is readOnly
    // (e.g., on mobile where we can't let the virtual keyboard pop up).
    if (key.length === 1) {
      bufferRef.current += key;
    }

    // Reset buffer if it sits idle too long
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      bufferRef.current = '';
      if (inputRef.current) inputRef.current.value = '';
    }, 2000);

    return 'buffer';
  }, [enabled, maxIntervalMs, minLength, onScan]);

  // Input-level handler (desktop path — hidden input is focused)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const result = processKey(e.key, { ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });
    if (result === 'fire' || e.key === 'Enter') {
      e.preventDefault();
    }
  }, [processKey]);

  // Document-level listener — catches scanner input on mobile (no focused input)
  // and as a fallback when the hidden input loses focus unexpectedly.
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Skip if the event already came from our hidden input (handled there).
      if (e.target === inputRef.current) return;

      // Skip if the user is typing in a regular form control.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return;
        }
      }

      const result = processKey(e.key, { ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });
      if (result === 'fire' || (e.key === 'Enter' && bufferRef.current === '')) {
        // Prevent default only when we actually consumed a scan
        if (result === 'fire') e.preventDefault();
      }
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [enabled, processKey]);

  // Auto-focus hidden input on desktop (not touch — would open virtual keyboard)
  useEffect(() => {
    if (!enabled || touchDevice) return;

    focusInput();

    const interval = setInterval(() => {
      const active = document.activeElement;
      const isOtherInput = active && active !== inputRef.current &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
      if (!isOtherInput) {
        focusInput();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, focusInput, touchDevice]);

  // Cleanup idle timer
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return {
    inputRef,
    inputProps: {
      ref: inputRef,
      onKeyDown: handleKeyDown,
      autoFocus: !touchDevice,
      readOnly: touchDevice,
      inputMode: 'none' as const,
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
    isTouchDevice: touchDevice,
  };
}
