/**
 * Guest-mode persistence.
 *
 * Backed by Capacitor Preferences rather than localStorage for the same reason
 * as `onboarding-state.ts`: WKWebView evicts localStorage under storage
 * pressure. Losing a half-finished 200-item compliance checklist is the worst
 * thing that can happen in guest mode, so it goes to UserDefaults /
 * SharedPreferences instead.
 *
 * Every read fails *closed* — it returns the empty default rather than throwing.
 * Guest mode has no account to fall back on, so a storage error must degrade to
 * "nothing saved yet", never to a broken screen.
 *
 * Writes are debounced. Each `Preferences.set` is a JS-to-native bridge
 * round-trip; ticking fifteen checkboxes quickly must not fire fifteen of them.
 * An in-memory map is the source of truth for the session and is flushed on a
 * trailing timer, plus unconditionally when the app is backgrounded — otherwise
 * the last tick before the user switches apps is lost.
 */
import { Preferences } from '@capacitor/preferences';

const NS = 'discover.v1.';
const FLUSH_DELAY_MS = 300;

export type ChecklistStatus = 'pending' | 'in_progress' | 'completed' | 'not_applicable';

/** Pending writes, keyed WITHOUT the namespace prefix. */
const pending = new Map<string, unknown>();
/** Session cache, so a read after a debounced write sees the new value. */
const cache = new Map<string, unknown>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const { value } = await Preferences.get({ key: NS + key });
    const parsed = value ? (JSON.parse(value) as T) : fallback;
    cache.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

function queueWrite(key: string, value: unknown): void {
  cache.set(key, value);
  pending.set(key, value);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flushGuestState(), FLUSH_DELAY_MS);
}

/** Write everything queued. Safe to call at any time; a no-op when idle. */
export async function flushGuestState(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  if (pending.size === 0) return;
  const batch = [...pending.entries()];
  pending.clear();
  await Promise.all(
    batch.map(async ([key, value]) => {
      try {
        await Preferences.set({ key: NS + key, value: JSON.stringify(value) });
      } catch {
        // Best effort. The value stays in `cache`, so the session is unaffected;
        // only persistence across a restart is lost.
      }
    })
  );
}

function pairKey(country: string, category: string): string {
  return `checklist.${country}-${category}`;
}

export const guestState = {
  /**
   * Checklist ticks, one Preferences key per country/category pair.
   *
   * Deliberately not one blob for everything: a single pair is ~222 items
   * (~9 KB), while all 3,259 would be ~130 KB rewritten on every single tick.
   */
  checklist: {
    load: (country: string, category: string) =>
      readJson<Record<string, ChecklistStatus>>(pairKey(country, category), {}),

    async set(country: string, category: string, itemId: string, status: ChecklistStatus) {
      const key = pairKey(country, category);
      const current = await readJson<Record<string, ChecklistStatus>>(key, {});
      queueWrite(key, { ...current, [itemId]: status });

      // The index lets the hub show "resume where you left off" and lets the
      // post-signup migration enumerate pairs without Preferences.keys().
      const pair = `${country}-${category}`;
      const index = await readJson<string[]>('checklist.index', []);
      if (!index.includes(pair)) queueWrite('checklist.index', [...index, pair]);
    },

    index: () => readJson<string[]>('checklist.index', []),

    /** Flat itemId -> status across every touched pair, for migration. */
    async all(): Promise<Record<string, ChecklistStatus>> {
      const index = await readJson<string[]>('checklist.index', []);
      const parts = await Promise.all(
        index.map((pair) => readJson<Record<string, ChecklistStatus>>(`checklist.${pair}`, {}))
      );
      return Object.assign({}, ...parts) as Record<string, ChecklistStatus>;
    },
  },

  qr: {
    load: <T>(fallback: T) => readJson<T>('qr', fallback),
    save: (value: unknown) => queueWrite('qr', value),
  },

  requirements: {
    load: <T>(fallback: T) => readJson<T>('requirements', fallback),
    save: (value: unknown) => queueWrite('requirements', value),
  },

  tips: {
    load: () =>
      readJson<{ seen: Record<string, string>; saved: string[] }>('tips', { seen: {}, saved: [] }),
    save: (value: { seen: Record<string, string>; saved: string[] }) => queueWrite('tips', value),
  },

  visited: {
    get: () => readJson<boolean>('visited', false),
    mark: () => queueWrite('visited', true),
  },

  migrated: {
    get: () => readJson<boolean>('migrated', false),
    mark: () => queueWrite('migrated', true),
  },

  /** "Clear guest data" — the honest answer to "what do you store about me". */
  async clearAll(): Promise<void> {
    const index = await readJson<string[]>('checklist.index', []);
    const keys = [
      'checklist.index',
      'qr',
      'requirements',
      'tips',
      'visited',
      'migrated',
      ...index.map((pair) => `checklist.${pair}`),
    ];
    pending.clear();
    cache.clear();
    await Promise.all(
      keys.map(async (key) => {
        try {
          await Preferences.remove({ key: NS + key });
        } catch {
          // Ignore — a key we cannot remove is a key that was likely never written.
        }
      })
    );
  },
};

/**
 * Flush pending writes when the app is backgrounded.
 *
 * Registered once from the guest shell. Without it the debounce window can
 * swallow the last change before the user switches apps, which reads as
 * "my ticks disappeared".
 */
export async function registerGuestStateFlush(): Promise<() => void> {
  try {
    const { App } = await import('@capacitor/app');
    const handle = await App.addListener('pause', () => {
      void flushGuestState();
    });
    return () => void handle.remove();
  } catch {
    return () => {};
  }
}
