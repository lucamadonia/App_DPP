import { bulkUpdateChecklistProgress } from '@/services/supabase/checklists';
import { flushGuestState, guestState } from './guest-state';

/**
 * How many ticks a single import will carry over.
 *
 * Each one costs two round trips (see the note on upsert below), so this is a
 * deliberate ceiling rather than an arbitrary one. A guest who ticked more than
 * this was evaluating the product, not doing the work — and the templates are
 * all still there once they sign in.
 */
const MAX_ITEMS = 120;

export interface GuestMigrationResult {
  imported: number;
  skipped: number;
}

/**
 * One-shot import of guest checklist progress into a freshly created tenant.
 *
 * This is the only guest state worth carrying over. `checklist_templates.id` is
 * the same UUID for a guest and for an account, so the ticks map across
 * directly. The generated QR code deliberately does NOT migrate: it encodes a
 * GS1 link or a free-text URL with no product behind it, so importing it would
 * create a passport pointing at nothing.
 *
 * Idempotent via `discover.v1.migrated`, and best-effort throughout: a failure
 * leaves the guest data in place to be retried on the next boot, and must never
 * block the app.
 *
 * NOTE on why this is not a single upsert. `checklist_progress` does carry
 * `UNIQUE(tenant_id, product_id, checklist_item_id)`, which looks like the
 * obvious conflict target — but guest ticks are always tenant-level, so
 * `product_id` is NULL, and in Postgres NULL never conflicts with NULL. The
 * constraint therefore does not match these rows at all, and an `onConflict`
 * upsert would silently insert duplicates instead of updating. The existing
 * select-then-write path handles the NULL case correctly, which is why it is
 * used here despite costing two round trips per item.
 */
export async function migrateGuestState(): Promise<GuestMigrationResult | null> {
  try {
    if (await guestState.migrated.get()) return null;

    // Anything still sitting in the debounce window would otherwise be lost.
    await flushGuestState();

    const all = await guestState.checklist.all();
    const touched = Object.entries(all).filter(([, status]) => status !== 'pending');

    if (touched.length === 0) {
      guestState.migrated.mark();
      await flushGuestState();
      return null;
    }

    const batch = touched.slice(0, MAX_ITEMS);
    const result = await bulkUpdateChecklistProgress(
      batch.map(([checklistItemId, status]) => ({
        checklistItemId,
        data: { status, checked: status === 'completed' },
      }))
    );

    if (!result.success) return null;

    guestState.migrated.mark();
    await flushGuestState();

    return { imported: batch.length, skipped: touched.length - batch.length };
  } catch {
    // Never let an import failure surface as a broken app. The flag stays
    // unset, so the next authenticated boot simply tries again.
    return null;
  }
}
