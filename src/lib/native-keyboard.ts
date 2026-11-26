/**
 * Publishes the software-keyboard height as the CSS variable `--kb-h`.
 *
 * `capacitor.config.ts` sets Keyboard `resize: none`, so the WebView keeps its
 * full height when the keyboard opens. That avoids the layout squash that
 * breaks sticky headers and bottom bars — but it means WE are responsible for
 * lifting anything anchored to the bottom. Consumers do:
 *
 *   bottom: calc(var(--kb-h) + var(--safe-bottom))
 */
import { isNative } from './platform';

function setKeyboardHeight(px: number): void {
  const height = Number.isFinite(px) ? Math.max(0, px) : 0;
  const root = document.documentElement;
  root.style.setProperty('--kb-h', `${height}px`);
  root.toggleAttribute('data-keyboard-open', height > 0);
}

/** Register the keyboard listeners. No-op on web. Returns a cleanup function. */
export function initNativeKeyboard(): () => void {
  if (!isNative()) return () => {};

  let disposed = false;
  let frame = 0;
  const revealFocusedInput = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (disposed) return;
      const input = document.activeElement;
      if (!(input instanceof HTMLElement) || !input.matches('input, textarea, [contenteditable="true"]')) return;
      const keyboardHeight = parseFloat(document.documentElement.style.getPropertyValue('--kb-h')) || 0;
      if (!keyboardHeight) return;
      const rect = input.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - keyboardHeight - 72 || rect.top < 72) {
        input.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    });
  };
  document.addEventListener('focusin', revealFocusedInput);
  const listeners: Array<{ remove: () => Promise<void> }> = [];
  const pending = (async () => {
    const { Keyboard } = await import('@capacitor/keyboard');
    if (disposed) return;
    listeners.push(await Keyboard.addListener('keyboardWillShow', (info) => {
      if (!disposed) setKeyboardHeight(info.keyboardHeight);
    }));
    listeners.push(await Keyboard.addListener('keyboardDidShow', revealFocusedInput));
    listeners.push(await Keyboard.addListener('keyboardWillHide', () => {
      if (!disposed) setKeyboardHeight(0);
    }));
  })().catch(() => undefined);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    document.removeEventListener('focusin', revealFocusedInput);
    void pending.then(() => Promise.allSettled(listeners.map((l) => l.remove())));
    setKeyboardHeight(0);
  };
}
