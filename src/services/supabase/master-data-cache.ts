import { Preferences } from '@capacitor/preferences';

/**
 * Preferences-backed layer under the in-memory master-data cache.
 *
 * Master data changes on the order of weeks, but the in-memory Map dies with
 * the process — so every cold start refetched roughly 270-450 KB of JSON on a
 * metered mobile connection. Persisting it keeps behaviour otherwise identical
 * (the same TTLs decide freshness) while surviving a process kill.
 *
 * This benefits the authenticated app exactly as much as guest mode, which is
 * the strongest argument for it: guest mode is only what made the waste
 * visible.
 *
 * Only RLS-free global tables are cached here — countries, regulations,
 * pictograms, recycling codes, checklist templates, news. Nothing tenant-scoped
 * or personal ever reaches this store.
 *
 * Every operation fails closed and silently: a cache is an optimisation, and a
 * storage error must never be able to break a data read.
 */
const PREFIX = 'md.v1.';

/**
 * Entries larger than this are not persisted.
 *
 * A pathological payload would cost more to serialise and write on every fetch
 * than the refetch it saves, and Preferences is not a blob store.
 */
const MAX_PERSIST_BYTES = 512 * 1024;

export interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * Keys eligible for persistence.
 *
 * `categories` is deliberately absent: it is the one master-data table with a
 * tenant-scoped RLS policy, so a cached copy could outlive the session that was
 * allowed to see it.
 */
const PERSISTABLE = [
  'countries',
  'euRegulations',
  'nationalRegulations',
  'pictograms',
  'recyclingCodes',
  'checklistTemplates',
  'news',
];

export function isPersistable(key: string): boolean {
  return PERSISTABLE.some((p) => key === p || key.startsWith(`${p}:`));
}

/**
 * Read every still-valid persisted entry back into memory.
 *
 * Called once at boot. Expired entries are dropped rather than returned, so a
 * stale entry can never outlive its TTL just because it was written to disk.
 */
export async function hydrateMasterDataCache(): Promise<Array<[string, CacheEntry]>> {
  try {
    const { keys } = await Preferences.keys();
    const mine = keys.filter((k) => k.startsWith(PREFIX));
    const now = Date.now();
    const out: Array<[string, CacheEntry]> = [];

    await Promise.all(
      mine.map(async (fullKey) => {
        try {
          const { value } = await Preferences.get({ key: fullKey });
          if (!value) return;
          const entry = JSON.parse(value) as CacheEntry;
          if (typeof entry?.expiresAt !== 'number' || entry.expiresAt <= now) {
            await Preferences.remove({ key: fullKey });
            return;
          }
          out.push([fullKey.slice(PREFIX.length), entry]);
        } catch {
          // A corrupt entry is simply not hydrated.
        }
      })
    );

    return out;
  } catch {
    return [];
  }
}

/** Fire-and-forget write. Never awaited by a read path. */
export function persistMasterDataEntry(key: string, data: unknown, expiresAt: number): void {
  if (!isPersistable(key)) return;
  void (async () => {
    try {
      const value = JSON.stringify({ data, expiresAt } satisfies CacheEntry);
      if (value.length > MAX_PERSIST_BYTES) return;
      await Preferences.set({ key: PREFIX + key, value });
    } catch {
      // Best effort: the in-memory cache still holds the value for this session.
    }
  })();
}

/**
 * Drop persisted entries, optionally only those matching a pattern.
 *
 * Mirrors invalidateCache in master-data.ts. Without this an admin edit would
 * clear the in-memory copy but leave the on-disk one, which then reappears on
 * the next cold start.
 */
export async function invalidatePersistedCache(pattern?: string): Promise<void> {
  try {
    const { keys } = await Preferences.keys();
    const doomed = keys.filter(
      (k) => k.startsWith(PREFIX) && (!pattern || k.slice(PREFIX.length).includes(pattern))
    );
    await Promise.all(
      doomed.map((k) => Preferences.remove({ key: k }).catch(() => undefined))
    );
  } catch {
    // Nothing to do — a cache that cannot be cleared still expires on its TTL.
  }
}

/** Drop everything this module owns. Used by the guest "clear my data" action. */
export function clearMasterDataCache(): Promise<void> {
  return invalidatePersistedCache();
}
