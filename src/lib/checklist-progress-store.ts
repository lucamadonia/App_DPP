/**
 * Where checklist ticks are kept.
 *
 * `ChecklistPage` is reused verbatim by guest mode, where there is no tenant and
 * therefore no `checklist_progress` row to write. Rather than fork an
 * 868-line page, the page takes an optional store whose default is exactly the
 * Supabase behaviour that shipped before this indirection existed — so the
 * authenticated path cannot regress.
 */
import { getChecklistProgress, updateChecklistProgress } from '@/services/supabase';
import { guestState, type ChecklistStatus } from './guest-state';

export type { ChecklistStatus };

export interface ChecklistProgressStore {
  /** Statuses for one country/category pair, keyed by checklist_templates.id. */
  load(country: string, category: string): Promise<Record<string, ChecklistStatus>>;
  set(
    country: string,
    category: string,
    itemId: string,
    status: ChecklistStatus
  ): Promise<void>;
}

/**
 * Default store — tenant-scoped Supabase rows.
 *
 * `getChecklistProgress()` is not filtered by country/category (it never was:
 * the table has no such columns, the template id already encodes the pair), so
 * the arguments are accepted for interface symmetry and ignored here.
 */
export const supabaseChecklistStore: ChecklistProgressStore = {
  async load() {
    const rows = await getChecklistProgress();
    const map: Record<string, ChecklistStatus> = {};
    for (const row of rows ?? []) map[row.checklist_item_id] = row.status;
    return map;
  },
  async set(_country, _category, itemId, status) {
    await updateChecklistProgress(itemId, { status, checked: status === 'completed' });
  },
};

/** Guest store — Capacitor Preferences, no account required. */
export const guestChecklistStore: ChecklistProgressStore = {
  load: (country, category) => guestState.checklist.load(country, category),
  set: (country, category, itemId, status) =>
    guestState.checklist.set(country, category, itemId, status),
};
