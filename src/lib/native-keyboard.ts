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
  document.documentElement.style.setProperty('--kb-h', `${px}px`);
}

/** Register the keyboard listeners. No-op on web. Returns a cleanup function. */
export function initNativeKeyboard(): () => void {
  if (!isNative()) return () => {};

  const pending = (async () => {
    const { Keyboard } = await import('@capacitor/keyboard');
    const show = await Keyboard.addListener('keyboardWillShow', (info) => {
      setKeyboardHeight(info.keyboardHeight);
    });
    const hide = await Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return [show, hide];
  })();

  return () => {
    void pending.then((listeners) => listeners.forEach((l) => l.remove()));
    setKeyboardHeight(0);
  };
}
