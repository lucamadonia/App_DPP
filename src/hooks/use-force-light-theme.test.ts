import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useForceLightTheme } from './use-force-light-theme';

const root = () => document.documentElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mockSystemDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  window.matchMedia = globalThis.matchMedia;
}

describe('useForceLightTheme', () => {
  beforeEach(() => {
    root().classList.remove('dark');
    root().style.colorScheme = '';
    localStorage.clear();
    mockSystemDark(true);
  });

  it('removes .dark while mounted and restores the user theme on unmount', () => {
    root().classList.add('dark');
    const { unmount } = renderHook(() => useForceLightTheme());
    expect(root().classList.contains('dark')).toBe(false);
    expect(root().style.colorScheme).toBe('light');

    unmount();
    expect(root().classList.contains('dark')).toBe(true);
    expect(root().style.colorScheme).toBe('');
  });

  it('strips .dark again when the theme hook re-applies it', async () => {
    const { unmount } = renderHook(() => useForceLightTheme());
    root().classList.add('dark');
    await flush();
    expect(root().classList.contains('dark')).toBe(false);
    unmount();
  });

  it('keeps the lock until the last nested consumer unmounts', () => {
    const outer = renderHook(() => useForceLightTheme());
    const inner = renderHook(() => useForceLightTheme());
    inner.unmount();
    expect(root().style.colorScheme).toBe('light');
    outer.unmount();
    expect(root().style.colorScheme).toBe('');
  });

  it('restores light when the stored preference is light', () => {
    localStorage.setItem('theme', 'light');
    const { unmount } = renderHook(() => useForceLightTheme());
    unmount();
    expect(root().classList.contains('dark')).toBe(false);
  });

  it('does nothing when disabled', () => {
    root().classList.add('dark');
    const { unmount } = renderHook(() => useForceLightTheme(false));
    expect(root().classList.contains('dark')).toBe(true);
    unmount();
  });
});
