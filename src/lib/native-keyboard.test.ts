import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { initNativeKeyboard } from './native-keyboard';

const { listeners, remove, isNative } = vi.hoisted(() => ({
  listeners: new Map<string, (info: { keyboardHeight: number }) => void>(),
  remove: vi.fn(),
  isNative: vi.fn(() => true),
}));
vi.mock('./platform', () => ({ isNative }));
vi.mock('@capacitor/keyboard', () => ({ Keyboard: {
  addListener: vi.fn(async (name, callback) => { listeners.set(name, callback); return { remove }; }),
} }));

describe('native keyboard lifecycle', () => {
  beforeEach(() => { listeners.clear(); remove.mockClear(); isNative.mockReturnValue(true); });
  afterEach(() => { document.documentElement.removeAttribute('data-keyboard-open'); document.documentElement.style.removeProperty('--kb-h'); });

  it('lifts content for the keyboard and restores it when dismissed', async () => {
    const dispose = initNativeKeyboard();
    await vi.waitFor(() => expect(listeners.has('keyboardWillHide')).toBe(true));
    listeners.get('keyboardWillShow')!({ keyboardHeight: 300 });
    expect(document.documentElement.style.getPropertyValue('--kb-h')).toBe('300px');
    expect(document.documentElement.hasAttribute('data-keyboard-open')).toBe(true);
    listeners.get('keyboardWillHide')!({ keyboardHeight: 0 });
    expect(document.documentElement.style.getPropertyValue('--kb-h')).toBe('0px');
    expect(document.documentElement.hasAttribute('data-keyboard-open')).toBe(false);
    dispose();
    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(3));
  });

  it('ignores late events after cleanup, including StrictMode remounts', async () => {
    const dispose = initNativeKeyboard();
    await vi.waitFor(() => expect(listeners.has('keyboardWillHide')).toBe(true));
    dispose();
    listeners.get('keyboardWillShow')!({ keyboardHeight: 320 });
    expect(document.documentElement.style.getPropertyValue('--kb-h')).toBe('0px');
    expect(document.documentElement.hasAttribute('data-keyboard-open')).toBe(false);
  });

  it('does not subscribe in the browser', () => {
    isNative.mockReturnValue(false);
    initNativeKeyboard()();
    expect(listeners.size).toBe(0);
  });
});
